import { test, expect } from "./helpers/test";
import { createForm } from "./helpers/selectors";

test.describe("create-match form", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#/nuevo");
  });

  test("empty nombre shows validation error", async ({ page }) => {
    await createForm.ubicacion(page).fill("Cancha Validación");
    await createForm.submit(page).click();
    await expect(createForm.formError(page)).toContainText(/nombre/i);
  });

  test("empty ubicacion shows validation error", async ({ page }) => {
    await createForm.nombre(page).fill("e2e-validation-ubicacion");
    await createForm.submit(page).click();
    await expect(createForm.formError(page)).toContainText(/ubicación/i);
  });

  test("player-count buttons are mutually exclusive", async ({ page }) => {
    const five = createForm.playerCountOption(page, 10);
    const seven = createForm.playerCountOption(page, 14);

    await five.click();
    await expect(five).toHaveClass(/selected/);

    await seven.click();
    await expect(seven).toHaveClass(/selected/);
    await expect(five).not.toHaveClass(/selected/);
  });

  test("back link returns to splash", async ({ page }) => {
    await createForm.backLink(page).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator(".app--splash")).toBeVisible();
  });
});
