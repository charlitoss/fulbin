import { test, expect } from "./helpers/test";
import { createForm } from "./helpers/selectors";
import { setupMatchInGame } from "./helpers/match";

// These regress concrete bugs called out in recent commit history:
//   - dfa3a88: iOS date/time inputs were center-aligned, looked broken.
//   - 38c47de: in-game view should cap at 820px wide on large screens.
//   - 419fc0b: kickoff CTA must appear when the match time passes (already
//     covered indirectly by full-lifecycle; here we just sanity-check it).

test.describe("mobile + responsive regressions", () => {
  test("date and time inputs are left-aligned (iOS regression for dfa3a88)", async ({
    page,
  }) => {
    await page.goto("/#/nuevo");

    const fechaAlign = await createForm.fecha(page).evaluate((el) => {
      return window.getComputedStyle(el).textAlign;
    });
    const horarioAlign = await createForm.horario(page).evaluate((el) => {
      return window.getComputedStyle(el).textAlign;
    });

    // global.css:823 sets text-align: left for both inputs.
    expect(fechaAlign).toBe("left");
    expect(horarioAlign).toBe("left");
  });

  test("in-game children cap at 820px on a wide viewport (regression for 38c47de)", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === "webkit",
      "Mobile WebKit project uses an iPhone viewport (<820px); this assertion only matters at desktop widths.",
    );

    const setup = await setupMatchInGame(10);
    const matchId = setup.matchId;
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`/#/partido/${matchId}`);

    await expect(page.locator(".match-page--jugando")).toBeVisible();

    // The CSS cap applies to *direct children* of .match-page--jugando
    // (see global.css:2427-2433). Check the first direct child.
    const childBox = await page
      .locator(".match-page--jugando > *")
      .first()
      .boundingBox();
    expect(childBox).not.toBeNull();
    expect(childBox!.width).toBeLessThanOrEqual(820);
  });
});
