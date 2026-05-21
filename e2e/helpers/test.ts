// Project-wide base test. Wraps Playwright's `test` with:
//   - automatic CRT-overlay disable (prevents flake from animated noise)
//   - automatic match cleanup after every test (wipes anything setupMatch
//     created in this test, regardless of pass/fail)
//
// Use this in specs instead of `import { test } from '@playwright/test'`.

import { test as base, expect } from "@playwright/test";
import { disableCrt, flushMatchCleanup } from "./match";

export const test = base.extend<{}>({
  page: async ({ page }, use) => {
    await disableCrt(page);
    await use(page);
  },
});

test.afterEach(async () => {
  await flushMatchCleanup();
});

export { expect };
