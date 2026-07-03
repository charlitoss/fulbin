import { execFile } from "node:child_process";
import path from "node:path";

// Run a deployed Convex function as a spoofed user identity, via
// `npx convex run --identity`. This goes through the REAL auth path on the
// deployment (ctx.auth.getUserIdentity() → users.by_workosId → memberships),
// which is what makes co-ownership testable end-to-end without a WorkOS
// login: Playwright can't mint a real session, but the CLI's admin
// credentials can act as any subject.
//
// Notes:
// - The CLI targets the deployment configured in .env.local
//   (CONVEX_DEPLOYMENT) — per e2e/README.md that is the same deployment
//   TEST_CONVEX_URL points at. Identities used by specs must have an
//   `e2e-` subject so testing.wipeAllTestData can sweep leftovers.
// - Each call spawns the CLI (~1-2s). Fine for orchestration specs; don't
//   use it in tight loops.

export type TestIdentity = {
  subject: string; // becomes users.workosId — MUST start with "e2e-"
  name?: string;
  email?: string;
  issuer?: string;
};

const REPO_ROOT = path.resolve(__dirname, "../..");
const CLI_TIMEOUT_MS = 30_000;

function convexRun(fn: string, args: object, identity?: TestIdentity): Promise<string> {
  const argv = [
    "convex",
    "run",
    fn,
    JSON.stringify(args),
    "--typecheck",
    "disable",
    "--codegen",
    "disable",
  ];
  if (identity) {
    if (!identity.subject.startsWith("e2e-")) {
      throw new Error(`Test identities must have an e2e- subject (got: ${identity.subject})`);
    }
    argv.push("--identity", JSON.stringify({ issuer: "https://e2e.test", ...identity }));
  }

  return new Promise((resolve, reject) => {
    execFile(
      "npx",
      argv,
      { cwd: REPO_ROOT, timeout: CLI_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`convex run ${fn} failed: ${stderr || error.message}`));
        } else {
          resolve(stdout);
        }
      },
    );
  });
}

// Run `fn` as `identity` and JSON-parse the result.
export async function runAs<T = unknown>(
  identity: TestIdentity,
  fn: string,
  args: object = {},
): Promise<T> {
  const stdout = await convexRun(fn, args, identity);
  const trimmed = stdout.trim();
  return (trimmed ? JSON.parse(trimmed) : null) as T;
}

// Run `fn` with NO identity (anonymous caller), for negative tests.
export async function runAnon<T = unknown>(fn: string, args: object = {}): Promise<T> {
  const stdout = await convexRun(fn, args);
  const trimmed = stdout.trim();
  return (trimmed ? JSON.parse(trimmed) : null) as T;
}
