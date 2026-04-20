/**
 * Tests for task: replace-promise-chains-with-async-await — TypeScript compilation
 *
 * Acceptance criteria:
 *   AC2: tsc --noEmit passes with no errors for both packages
 *
 * Strategy
 * --------
 * Runs `tsc --noEmit` for both the shared and orchestrator packages via
 * child_process.execSync and asserts zero exit code and no stderr output.
 *
 * These tests will be RED if the refactored async/await code contains any
 * TypeScript type errors introduced by the transformation.
 */

import { describe, it, expect } from "vitest";
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const _thisDir = path.dirname(fileURLToPath(import.meta.url));
// _thisDir = packages/orchestrator/src/__tests__ — go up 4 levels to repo root
const REPO_ROOT = path.resolve(_thisDir, "..", "..", "..", "..");
const SHARED_PKG = path.resolve(REPO_ROOT, "packages", "shared");
const ORCHESTRATOR_PKG = path.resolve(REPO_ROOT, "packages", "orchestrator");

/**
 * Run tsc --noEmit in the given package directory.
 * Returns { exitCode, stdout, stderr }.
 *
 * Uses the local node_modules/.bin/tsc binary directly so it works in
 * vitest's fork pool where pnpm may not be in PATH.
 */
function runTypecheck(pkgDir: string): {
  exitCode: number;
  stdout: string;
  stderr: string;
} {
  // Resolve the local tsc binary from the package's node_modules
  const tscBin = path.join(pkgDir, "node_modules", ".bin", "tsc");

  const result = spawnSync(tscBin, ["--noEmit"], {
    cwd: pkgDir,
    encoding: "utf8",
    timeout: 60_000,
  });

  // spawnSync returns status null if the process was killed by a signal
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

// ---------------------------------------------------------------------------
// AC2 — tsc --noEmit passes with no errors
// ---------------------------------------------------------------------------

describe("AC2 — tsc --noEmit passes with no errors after async/await refactor", () => {
  it("@lifeos/shared typechecks without errors (tsc --noEmit)", () => {
    const result = runTypecheck(SHARED_PKG);

    if (result.exitCode !== 0) {
      throw new Error(
        `tsc --noEmit failed in @lifeos/shared (exit ${result.exitCode}):\n` +
          `stdout:\n${result.stdout}\n` +
          `stderr:\n${result.stderr}`,
      );
    }

    expect(result.exitCode).toBe(0);
  }, 90_000);

  it("@lifeos/orchestrator typechecks without errors (tsc --noEmit)", () => {
    const result = runTypecheck(ORCHESTRATOR_PKG);

    if (result.exitCode !== 0) {
      throw new Error(
        `tsc --noEmit failed in @lifeos/orchestrator (exit ${result.exitCode}):\n` +
          `stdout:\n${result.stdout}\n` +
          `stderr:\n${result.stderr}`,
      );
    }

    expect(result.exitCode).toBe(0);
  }, 90_000);

  it("@lifeos/shared typecheck output contains no 'error TS' messages", () => {
    const result = runTypecheck(SHARED_PKG);
    const combined = result.stdout + result.stderr;
    expect(combined).not.toMatch(/error TS\d+/);
  }, 90_000);

  it("@lifeos/orchestrator typecheck output contains no 'error TS' messages", () => {
    const result = runTypecheck(ORCHESTRATOR_PKG);
    const combined = result.stdout + result.stderr;
    expect(combined).not.toMatch(/error TS\d+/);
  }, 90_000);
});
