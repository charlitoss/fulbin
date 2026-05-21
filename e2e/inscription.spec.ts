import { test, expect } from "./helpers/test";
import { matchPage } from "./helpers/selectors";
import { setupMatch } from "./helpers/match";
import { seedRegistrations } from "./helpers/convex";

test.describe("inscription step", () => {
  test("Armar equipos button is disabled until quota is met", async ({
    page,
  }) => {
    const { matchId, playerIds } = await setupMatch({ cantidadJugadores: 10 });

    // Register only 5 of 10 — should still be disabled.
    await seedRegistrations({ matchId, playerIds: playerIds.slice(0, 5) });

    await page.goto(`/#/partido/${matchId}`);
    await expect(matchPage.inscriptionStep(page)).toBeVisible();
    await expect(matchPage.continueButton(page)).toBeDisabled();
  });

  test("Armar equipos enables once all jugadores are registered", async ({
    page,
  }) => {
    const { matchId, playerIds } = await setupMatch({ cantidadJugadores: 10 });
    await seedRegistrations({ matchId, playerIds });

    await page.goto(`/#/partido/${matchId}`);
    await expect(matchPage.continueButton(page)).toBeEnabled();
    // The complete message is rendered when quota fills (InscriptionStep.jsx:178).
    await expect(page.locator(".progress-message.complete")).toBeVisible();
  });

  test("suplentes and hinchada do not count toward the jugador quota", async ({
    page,
  }) => {
    const { matchId, playerIds } = await setupMatch({ cantidadJugadores: 10 });

    // 9 jugadores + 1 suplente + 1 hinchada → quota still not met.
    await seedRegistrations({
      matchId,
      playerIds: playerIds.slice(0, 9),
      tipoInscripcion: "jugador",
    });
    await seedRegistrations({
      matchId,
      playerIds: [playerIds[9]],
      tipoInscripcion: "suplente",
    });

    await page.goto(`/#/partido/${matchId}`);
    await expect(matchPage.continueButton(page)).toBeDisabled();
  });
});
