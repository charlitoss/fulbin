import { test, expect } from "./helpers/test";
import { setupMatch } from "./helpers/match";
import { advanceToStep, seedRegistrations } from "./helpers/convex";

// Copy polish (#44): voseo, acentos, signos de apertura, sentence case.
test.describe("copy: voseo y acentos", () => {
  test("splash: headline y pasos en voseo, footer dice GitHub", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".splash-headline")).toContainText("Organizá el fulbito");
    await expect(page.locator(".splash-headline")).toContainText("con amigos");

    const labels = page.locator(".splash-howto-label");
    await expect(labels).toHaveText([
      "Creá tu partido",
      "Invitá a tus amigos",
      "Armá los equipos",
      "Anotá los goles",
    ]);

    const gh = page.getByRole("link", { name: "GitHub", exact: true });
    await expect(gh).toBeVisible();
    await expect(gh).toHaveAttribute("href", "https://github.com/charlitoss");
  });

  test("inscripción: título ¿Jugás? y faltante en voseo", async ({ page }) => {
    const { matchId, playerIds } = await setupMatch({ cantidadJugadores: 10 });
    await seedRegistrations({ matchId, playerIds: playerIds.slice(0, 9) });

    await page.goto(`/#/partido/${matchId}`);
    await expect(page.locator(".step-title").first()).toHaveText("¿Jugás?");
    await expect(page.locator(".continue-hint")).toHaveText("Falta 1 jugador");
  });

  test("inscripción: plural del faltante y cupo completo con ¡", async ({ page }) => {
    const { matchId, playerIds } = await setupMatch({ cantidadJugadores: 10 });
    await seedRegistrations({ matchId, playerIds: playerIds.slice(0, 5) });
    await page.goto(`/#/partido/${matchId}`);
    await expect(page.locator(".continue-hint")).toHaveText("Faltan 5 jugadores");

    await seedRegistrations({ matchId, playerIds: playerIds.slice(5) });
    // Visible complete message lives in InscriptionStep (ProgressBar's is not rendered).
    await expect(page.locator(".progress-message.complete")).toHaveText("¡Somos 10! Se juega");
  });

  test("balance: título completo en sentence case (solo desktop)", async ({ page, viewport }) => {
    test.skip(
      !viewport || viewport.width <= 640,
      "mobile muestra la variante corta 'Balance'",
    );
    const { matchId, playerIds } = await setupMatch({ cantidadJugadores: 10 });
    await seedRegistrations({ matchId, playerIds });
    await advanceToStep(matchId, "armado_equipos");

    await page.goto(`/#/partido/${matchId}`);
    await expect(page.locator(".balance-title-full")).toHaveText("Balance de equipos", {
      timeout: 10_000,
    });
  });

  test("balance: variante corta en mobile", async ({ page, viewport }) => {
    test.skip(!viewport || viewport.width > 640, "solo mobile");
    const { matchId, playerIds } = await setupMatch({ cantidadJugadores: 10 });
    await seedRegistrations({ matchId, playerIds });
    await advanceToStep(matchId, "armado_equipos");

    await page.goto(`/#/partido/${matchId}`);
    await expect(page.locator(".balance-title-short")).toHaveText("Balance", {
      timeout: 10_000,
    });
  });
});
