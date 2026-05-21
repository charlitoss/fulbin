import { test, expect } from "./helpers/test";
import { splash, createForm, matchPage } from "./helpers/selectors";

test.describe("smoke", () => {
  test("splash loads with primary CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".app--splash")).toBeVisible();
    await expect(splash.cta(page)).toBeVisible();
    await expect(page.locator(".splash-headline")).toBeVisible();
  });

  test("/nuevo renders the create-match form", async ({ page }) => {
    await page.goto("/#/nuevo");
    await expect(createForm.nombre(page)).toBeVisible();
    await expect(createForm.fecha(page)).toBeVisible();
    await expect(createForm.horario(page)).toBeVisible();
    await expect(createForm.ubicacion(page)).toBeVisible();

    // All six player-count options should be present.
    for (const total of [10, 12, 14, 16, 18, 22]) {
      await expect(createForm.playerCountOption(page, total)).toBeVisible();
    }
  });

  test("submitting the form creates a match and lands on the inscription step", async ({
    page,
  }) => {
    await page.goto("/#/nuevo");

    await createForm.nombre(page).fill("e2e-smoke-create");
    await createForm.ubicacion(page).fill("Cancha Smoke");
    await createForm.playerCountOption(page, 10).click();
    await createForm.submit(page).click();

    await expect(page).toHaveURL(/#\/partido\/[a-z0-9]+/i);
    await expect(matchPage.inscriptionStep(page)).toBeVisible();
  });
});
