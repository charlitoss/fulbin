import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenv } from "dotenv";
import path from "node:path";

// Load .env.test so VITE_CONVEX_URL gets pushed into the Vite dev server the
// `webServer` block spawns, and TEST_CONVEX_URL is available to global-setup +
// helpers.
loadDotenv({ path: path.resolve(__dirname, ".env.test") });

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [["github"], ["html"]] : "html",
  timeout: 30_000,
  expect: { timeout: 7_000 },

  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      testIgnore: "co-ownership.spec.ts",
    },
    {
      name: "webkit-mobile-iphone",
      use: { ...devices["iPhone 13"] },
      testIgnore: "co-ownership.spec.ts",
    },
    {
      // Backend orchestration via `npx convex run --identity` (one CLI spawn
      // per call, ~1-2s each). Isolated in its own project that runs AFTER
      // the browser projects so the subprocess churn can't starve their
      // timing-sensitive UI flows. Run it alone with:
      //   npx playwright test --project=co-ownership --no-deps
      name: "co-ownership",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      testMatch: "co-ownership.spec.ts",
      dependencies: ["chromium-desktop", "webkit-mobile-iphone"],
    },
  ],

  webServer: {
    // `--port` ensures we don't accidentally grab a different port if 3000 is taken;
    // `--strictPort` makes Vite fail loudly instead of incrementing silently.
    command: "npm run dev -- --port 3000 --strictPort --no-open",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      // Force Vite to talk to the test Convex deployment regardless of any
      // .env.local the developer has lying around.
      VITE_CONVEX_URL: process.env.TEST_CONVEX_URL ?? "",
    },
  },
});
