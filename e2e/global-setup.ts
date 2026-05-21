import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Refuses to run unless either (a) the configured TEST_CONVEX_URL contains
// "test" (dedicated test deployment) or (b) ALLOW_TEST_MUTATIONS=1 is
// explicitly set (opt-in to running against a shared dev deployment). All
// destructive Convex mutations only target rows whose nombre starts with
// "e2e-", so the worst case is that the test suite churns a few e2e- rows in
// the dev DB during a run.
const REQUIRED_URL_MARKER = "test";

export default async function globalSetup(): Promise<void> {
  const url = process.env.TEST_CONVEX_URL;
  if (!url) {
    throw new Error(
      "TEST_CONVEX_URL is not set. Create a .env.test with TEST_CONVEX_URL=<convex deployment URL>.",
    );
  }

  const urlIsTestMarked = url.toLowerCase().includes(REQUIRED_URL_MARKER);
  const explicitOptIn = process.env.ALLOW_TEST_MUTATIONS === "1";

  if (!urlIsTestMarked && !explicitOptIn) {
    throw new Error(
      `TEST_CONVEX_URL does not contain '${REQUIRED_URL_MARKER}' (got: ${url}). ` +
        "Refusing to run. Either point at a dedicated test deployment, or set " +
        "ALLOW_TEST_MUTATIONS=1 to explicitly opt in to running against a shared deployment.",
    );
  }

  if (!urlIsTestMarked && explicitOptIn) {
    // eslint-disable-next-line no-console
    console.warn(
      `[e2e] global-setup: running against non-test deployment (${url}) ` +
        "with ALLOW_TEST_MUTATIONS=1 — only 'e2e-*' rows will be touched.",
    );
  }

  const client = new ConvexHttpClient(url);
  const result = await client.mutation(api.testing.wipeAllTestData, {});
  // eslint-disable-next-line no-console
  console.log(
    `[e2e] global-setup: wiped ${result.matchesRemoved} match(es) and ${result.playersRemoved} player(s) from prior runs.`,
  );
}
