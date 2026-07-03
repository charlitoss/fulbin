// Co-ownership (co-managed groups), end to end against the real deployment.
//
// Auth-gated flows can't go through a real WorkOS login in CI, so the
// group/membership story is driven backend-side via `npx convex run
// --identity` (see helpers/identity.ts) — every call still crosses the real
// deployed auth path (ctx.auth → users.by_workosId → memberships). The
// anonymous surfaces (invite page, public group page) are then verified in
// the actual browser.
//
// Flow under test:
//   owner signs up → invites → co-admin joins → co-admin creates a season +
//   match in the SHARED group → both manage it → finished match lands in
//   BOTH users' standings → outsiders are rejected → removal revokes access.

import { test, expect } from "./helpers/test";
import { runAs, runAnon, type TestIdentity } from "./helpers/identity";
import {
  getConvexClient,
  getE2eSecret,
  seedPlayers,
  uniqueRunId,
  type MatchId,
  type PlayerId,
} from "./helpers/convex";
import { api } from "../convex/_generated/api";

// Sequential story — later tests depend on earlier state. The CLI round trips
// are ~1-2s each, hence the generous timeout.
test.describe.configure({ mode: "serial", timeout: 120_000 });

const RUN = uniqueRunId();
const OWNER: TestIdentity = { subject: `e2e-owner-${RUN}`, name: `e2e-owner-${RUN}` };
const COADMIN: TestIdentity = { subject: `e2e-coadmin-${RUN}`, name: `e2e-coadmin-${RUN}` };
const STRANGER: TestIdentity = { subject: `e2e-stranger-${RUN}`, name: `e2e-stranger-${RUN}` };

// Shared state threaded through the serial tests.
let groupId: string;
let inviteCode: string;
let coadminUserId: string;
let tournamentId: string;
let matchId: MatchId;
let playerIds: PlayerId[] = [];
let publicToken: string;

type GroupRow = {
  _id: string;
  nombre: string;
  rol: string;
  esActivo: boolean;
  miembros: number;
  inviteCode?: string;
  publicToken?: string;
  publico: boolean;
};

test.describe("co-ownership", () => {
  test.afterAll(async () => {
    // Best-effort cleanup; global-setup sweeps anything this misses.
    const convex = getConvexClient();
    const secret = getE2eSecret();
    if (matchId) {
      await convex
        .mutation(api.testing.wipeMatchCascade, { secret, matchId })
        .catch(() => {});
    }
    if (playerIds.length) {
      await convex
        .mutation(api.testing.wipeSeeded, { secret, matchIds: [], playerIds })
        .catch(() => {});
    }
    for (const who of [COADMIN, STRANGER, OWNER]) {
      await convex
        .mutation(api.testing.wipeE2EUser, { secret, workosId: who.subject })
        .catch(() => {});
    }
  });

  test("owner invites and a second account joins as co-admin", async () => {
    // Signing up creates the personal group with an owner membership.
    await runAs(OWNER, "users:ensureUser", { nombre: OWNER.name });
    const ownerGroups = await runAs<GroupRow[]>(OWNER, "groups:myGroups");
    expect(ownerGroups).toHaveLength(1);
    expect(ownerGroups[0].rol).toBe("owner");
    expect(ownerGroups[0].esActivo).toBe(true);
    groupId = ownerGroups[0]._id;

    // Owner mints an invite link.
    inviteCode = await runAs<string>(OWNER, "groups:rotateInvite", { groupId });
    expect(inviteCode).toMatch(/^[A-Z0-9]{6}$/);

    // The anonymous preview shows the group without leaking secrets.
    const preview = await runAnon<{ nombre: string; miembros: number }>(
      "groups:byInviteCode",
      { code: inviteCode },
    );
    expect(preview?.nombre).toBe(`Grupo de ${OWNER.name}`);
    expect(preview?.miembros).toBe(1);

    // Second account joins and is switched into the shared group.
    await runAs(COADMIN, "users:ensureUser", { nombre: COADMIN.name });
    const joined = await runAs<string>(COADMIN, "groups:joinByInvite", { code: inviteCode });
    expect(joined).toBe(groupId);

    const coadminGroups = await runAs<GroupRow[]>(COADMIN, "groups:myGroups");
    const shared = coadminGroups.find((g) => g._id === groupId);
    expect(shared).toBeTruthy();
    expect(shared!.rol).toBe("admin");
    expect(shared!.esActivo).toBe(true);
    expect(shared!.miembros).toBe(2);

    // Owner sees both members; capture the co-admin's user id for removal.
    const members = await runAs<{ userId: string; rol: string; nombre: string }[]>(
      OWNER,
      "groups:members",
      { groupId },
    );
    expect(members).toHaveLength(2);
    expect(members[0].rol).toBe("owner");
    coadminUserId = members.find((m) => m.rol === "admin")!.userId;
  });

  test("co-admin's season and match land in the shared group", async () => {
    // The co-admin starts a season — the OWNER must see it as theirs too.
    tournamentId = await runAs<string>(COADMIN, "tournaments:create", {
      nombre: `e2e-torneo-${RUN}`,
    });
    const ownerTournaments = await runAs<{ _id: string; activo: boolean }[]>(
      OWNER,
      "tournaments:mine",
    );
    expect(ownerTournaments.map((t) => t._id)).toContain(tournamentId);
    expect(ownerTournaments.find((t) => t._id === tournamentId)!.activo).toBe(true);

    // The co-admin creates a match: it must attach to the shared group AND
    // its active tournament.
    matchId = (await runAs<string>(COADMIN, "matches:create", {
      nombre: `e2e-coown-${RUN}`,
      fecha: new Date().toISOString().slice(0, 10),
      horario: "20:00",
      ubicacion: "Cancha E2E",
      cantidadJugadores: 4,
      jugadoresPorEquipo: 2,
    })) as MatchId;
    const match = await runAnon<{ groupId: string; tournamentId: string }>(
      "matches:getById",
      { matchId },
    );
    expect(match?.groupId).toBe(groupId);
    expect(match?.tournamentId).toBe(tournamentId);

    // Both accounts see it in "Mis partidos", and both can edit it.
    for (const who of [OWNER, COADMIN]) {
      const mine = await runAs<{ _id: string }[]>(who, "matches:myMatches");
      expect(mine.map((m) => m._id)).toContain(matchId);
    }
    await runAs(OWNER, "matches:update", { matchId, ubicacion: "Cancha E2E (editada)" });
  });

  test("a finished match counts toward BOTH accounts' standings", async () => {
    playerIds = await seedPlayers({ namePrefix: `e2e-coown-${RUN}`, count: 4 });
    const [p1, p2, p3, p4] = playerIds;

    // Co-admin builds teams (p1 scores twice, p3 once), owner blows the
    // final whistle — co-management across the whole lifecycle.
    await runAs(COADMIN, "teamConfigurations:save", {
      partidoId: matchId,
      asignaciones: [
        { jugadorId: p1, equipo: "blanco", rol: "delantero", goles: 2 },
        { jugadorId: p2, equipo: "blanco", rol: "arquero" },
        { jugadorId: p3, equipo: "oscuro", rol: "delantero", goles: 1 },
        { jugadorId: p4, equipo: "oscuro", rol: "arquero" },
      ],
    });
    await runAs(COADMIN, "matches:update", { matchId, pasoActual: "armado_equipos" });
    await runAs(COADMIN, "matches:startMatch", { matchId });
    await runAs(OWNER, "matches:finishMatch", { matchId });

    const match = await runAnon<{ pasoActual: string; resultado: { golesBlanco: number; golesOscuro: number } }>(
      "matches:getById",
      { matchId },
    );
    expect(match?.pasoActual).toBe("finalizado");
    expect(match?.resultado).toMatchObject({ golesBlanco: 2, golesOscuro: 1 });

    // The same standings for owner and co-admin: winners 3pts, losers 0.
    for (const who of [OWNER, COADMIN]) {
      const stats = await runAs<{ partidos: number; tabla: { playerId: string; puntos: number; goles: number }[] }>(
        who,
        "stats:myStats",
        { tournamentId },
      );
      expect(stats.partidos).toBe(1);
      const rows = Object.fromEntries(stats.tabla.map((r) => [r.playerId, r]));
      expect(rows[p1]).toMatchObject({ puntos: 3, goles: 2 });
      expect(rows[p2]).toMatchObject({ puntos: 3, goles: 0 });
      expect(rows[p3]).toMatchObject({ puntos: 0, goles: 1 });
      expect(rows[p4]).toMatchObject({ puntos: 0, goles: 0 });
    }
  });

  test("outsiders cannot touch the group", async () => {
    // A third signed-in account that never joined…
    await runAs(STRANGER, "users:ensureUser", { nombre: STRANGER.name });
    await expect(
      runAs(STRANGER, "matches:update", { matchId, nombre: `e2e-hijacked-${RUN}` }),
    ).rejects.toThrow(/NO_AUTORIZADO/);
    await expect(runAs(STRANGER, "groups:members", { groupId })).rejects.toThrow(
      /NO_AUTORIZADO/,
    );
    // …and a fully anonymous caller: grouped matches are NOT open.
    await expect(
      runAnon("matches:update", { matchId, nombre: `e2e-hijacked-${RUN}` }),
    ).rejects.toThrow(/NO_AUTORIZADO/);
    // The stranger's own standings are NOT polluted by the group's match.
    const stats = await runAs<{ partidos: number } | null>(STRANGER, "stats:myStats", {});
    expect(stats?.partidos ?? 0).toBe(0);
  });

  test("invite page renders for an anonymous visitor", async ({ page }) => {
    await page.goto(`/#/unirse/${inviteCode}`);
    await expect(page.getByRole("heading", { name: "Te invitaron a co-organizar" })).toBeVisible();
    await expect(page.getByText(`Grupo de ${OWNER.name}`)).toBeVisible();
    await expect(page.getByText("2 miembros")).toBeVisible();
  });

  test("public group page shows the shared standings read-only", async ({ page }) => {
    // Owner flips the public page on; any member may read the token.
    await runAs(OWNER, "groups:setPublic", { groupId, publico: true });
    const groups = await runAs<GroupRow[]>(OWNER, "groups:myGroups");
    publicToken = groups.find((g) => g._id === groupId)!.publicToken!;
    expect(publicToken.length).toBeGreaterThanOrEqual(16);

    await page.goto(`/#/g/${publicToken}`);
    await expect(page.getByRole("heading", { name: `Grupo de ${OWNER.name}` })).toBeVisible();
    await expect(page.getByText("Página pública · solo lectura")).toBeVisible();
    // The finished match's scorer appears in the public table with points.
    await expect(page.getByRole("button", { name: `e2e-coown-${RUN}-1` })).toBeVisible();
    await expect(page.getByRole("button", { name: "Compartir" })).toBeVisible();

    // A wrong token resolves to the not-available screen, not data.
    await page.goto(`/#/g/WRONGTOKEN0000000000`);
    await expect(page.getByRole("heading", { name: "Página no disponible" })).toBeVisible();
  });

  test("removing the co-admin revokes access; revoking the invite kills the link", async () => {
    await runAs(OWNER, "groups:removeMember", { groupId, userId: coadminUserId });

    // The co-admin falls back to their personal group and loses the shared data.
    const coadminGroups = await runAs<GroupRow[]>(COADMIN, "groups:myGroups");
    expect(coadminGroups.map((g) => g._id)).not.toContain(groupId);
    const mine = await runAs<{ _id: string }[]>(COADMIN, "matches:myMatches");
    expect(mine.map((m) => m._id)).not.toContain(matchId);
    await expect(
      runAs(COADMIN, "matches:update", { matchId, nombre: `e2e-expelled-${RUN}` }),
    ).rejects.toThrow(/NO_AUTORIZADO/);

    // Revoking the invite invalidates the link for future joiners.
    await runAs(OWNER, "groups:revokeInvite", { groupId });
    const preview = await runAnon("groups:byInviteCode", { code: inviteCode });
    expect(preview).toBeNull();
    await expect(runAs(COADMIN, "groups:joinByInvite", { code: inviteCode })).rejects.toThrow(
      /INVITACION_INVALIDA/,
    );
  });
});
