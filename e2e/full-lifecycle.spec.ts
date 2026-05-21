import { test, expect } from "./helpers/test";
import { matchPage, inGame } from "./helpers/selectors";
import { setupMatch, setupMatchInGame } from "./helpers/match";
import { backdateKickoff, getConvexClient } from "./helpers/convex";
import { api } from "../convex/_generated/api";

test.describe("full match lifecycle", () => {
  test("create → seed registrations → advance to in-game → score goal → finish → finalized recap", async ({
    page,
  }) => {
    const { matchId } = await setupMatch({
      cantidadJugadores: 10,
      registerPlayers: true,
    });

    await backdateKickoff(matchId);

    // Land on the match. The header's "Empezar partido" CTA needs
    // armado_equipos + isPastKickoff (see EditableMatchHeader.jsx:291).
    await page.goto(`/#/partido/${matchId}`);
    await expect(matchPage.inscriptionStep(page)).toBeVisible();

    // Quota is met; the "Armar equipos" button should be enabled.
    await expect(matchPage.continueButton(page)).toBeEnabled();
    await matchPage.continueButton(page).click();

    // Wait for the armado_equipos view.
    await expect(page.locator(".match-page--armado_equipos")).toBeVisible();

    // Click "Empezar partido" — only renders because kickoff is backdated.
    const startBtn = page.getByRole("button", { name: /^Empezar partido$/i });
    await expect(startBtn).toBeVisible({ timeout: 10_000 });
    await startBtn.click();

    // In-game view should render with the score 0–0.
    await expect(page.locator(".match-page--jugando")).toBeVisible();
    await expect(page.locator(".in-game-scoreboard")).toBeVisible();

    // Score a goal via Convex. Auto-generated teams placed players based on
    // skill, so we read the actual assignment from the saved team config and
    // pick a real player rather than guessing.
    const convex = getConvexClient();
    const teamConfig = await convex.query(api.teamConfigurations.getByMatch, {
      matchId,
    });
    expect(teamConfig).not.toBeNull();
    const firstPlayer = teamConfig!.asignaciones[0];
    await convex.mutation(api.teamConfigurations.incrementPlayerGoals, {
      matchId,
      jugadorId: firstPlayer.jugadorId,
      delta: 1,
    });

    // The scoreboard surfaces the per-team total; one side should now show 1.
    await expect(page.locator(".in-game-scoreboard")).toContainText("1");

    // Finalize.
    const finishBtn = inGame.finishButton(page);
    await expect(finishBtn).toBeVisible();
    await finishBtn.click();

    await expect(page.locator(".match-page--finalizado")).toBeVisible();
  });

  test("refreshing mid-game preserves step, score, and team assignments", async ({
    page,
  }) => {
    const { matchId, playerIds } = await setupMatchInGame(10);

    // Score two goals via Convex before the page even loads.
    const convex = getConvexClient();
    await convex.mutation(api.teamConfigurations.incrementPlayerGoals, {
      matchId,
      jugadorId: playerIds[0],
      delta: 2,
    });

    await page.goto(`/#/partido/${matchId}`);
    await expect(page.locator(".match-page--jugando")).toBeVisible();
    await expect(page.locator(".in-game-scoreboard")).toContainText("2");

    await page.reload();

    // Same step, same score after a hard reload — proves Convex persistence
    // (the app stores no game state in localStorage).
    await expect(page.locator(".match-page--jugando")).toBeVisible();
    await expect(page.locator(".in-game-scoreboard")).toContainText("2");
  });
});
