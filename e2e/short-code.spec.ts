import { test, expect } from "./helpers/test";
import { matchPage } from "./helpers/selectors";
import { setupMatch } from "./helpers/match";

// `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — see convex/matches.ts:6
const SHORT_CODE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

test.describe("short-code sharing", () => {
  test("newly created matches get a 6-char codigoCorto from the restricted alphabet", async () => {
    const { codigoCorto } = await setupMatch();
    expect(codigoCorto).toMatch(SHORT_CODE_RE);
  });

  test("/p/CODE redirects to /partido/:id", async ({ page }) => {
    const { matchId, codigoCorto } = await setupMatch();

    await page.goto(`/#/p/${codigoCorto}`);

    await expect(page).toHaveURL(new RegExp(`#/partido/${matchId}$`));
    await expect(matchPage.inscriptionStep(page)).toBeVisible();
  });

  test("/p/<lowercase code> is normalized via toUpperCase", async ({ page }) => {
    const { matchId, codigoCorto } = await setupMatch();

    await page.goto(`/#/p/${codigoCorto.toLowerCase()}`);

    await expect(page).toHaveURL(new RegExp(`#/partido/${matchId}$`));
  });

  test("invalid short code renders the not-found state with a Volver button", async ({
    page,
  }) => {
    // ZZZZZZ uses only chars from the alphabet (matches the route regex) but no
    // match has it. Avoids hitting the route fallback to splash.
    await page.goto("/#/p/ZZZZZZ");

    await expect(matchPage.notFoundHeading(page)).toBeVisible();
    await page.getByRole("button", { name: /Volver al inicio/i }).click();
    await expect(page).toHaveURL(/#\/$/);
  });
});
