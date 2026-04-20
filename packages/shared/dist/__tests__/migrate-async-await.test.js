/**
 * Tests for task: replace-promise-chains-with-async-await
 *
 * Acceptance criteria:
 *   AC1: migrate.ts has no .then()/.catch() chains — uses await/try/catch instead
 *   AC2: tsc --noEmit passes with no errors
 *   AC3: pnpm test passes with no failures (verified by this suite itself passing)
 *
 * Strategy
 * --------
 * These are static source-analysis tests. They read the raw TypeScript source
 * of migrate.ts and assert that the promise-chain patterns (.then / .catch) are
 * absent. The tests are intentionally RED before the refactoring is applied.
 *
 * We also verify that the module still exports runMigrations as an async
 * function after the refactor — i.e. behaviour is preserved.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
// ---------------------------------------------------------------------------
// Resolve the path to the source file under test
// ---------------------------------------------------------------------------
const _thisDir = path.dirname(fileURLToPath(import.meta.url));
// __tests__/ is inside packages/shared/src/
const MIGRATE_TS_PATH = path.resolve(_thisDir, "..", "migrate.ts");
// ---------------------------------------------------------------------------
// Helper — read the raw source once for all assertions
// ---------------------------------------------------------------------------
function readSource(filePath) {
    return fs.readFileSync(filePath, "utf8");
}
// ---------------------------------------------------------------------------
// AC1 — migrate.ts must not contain .then() or .catch() chains
// ---------------------------------------------------------------------------
describe("AC1 — migrate.ts uses async/await, not .then()/.catch() chains", () => {
    it("migrate.ts source file exists", () => {
        expect(fs.existsSync(MIGRATE_TS_PATH)).toBe(true);
    });
    it("migrate.ts contains no .then( calls", () => {
        const source = readSource(MIGRATE_TS_PATH);
        // Match .then( with optional whitespace — covers .then( and .then (
        // We deliberately strip single-line comments before checking so that
        // commented-out examples do not produce false negatives.
        const sourceWithoutSingleLineComments = source
            .split("\n")
            .map((line) => {
            // Remove everything after // that isn't inside a string literal
            // Simple heuristic: strip from the first // not preceded by http(s):
            return line.replace(/(?<!https?:)\/\/.*$/, "");
        })
            .join("\n");
        // Remove block comments /** ... */ and /* ... */
        const sourceWithoutComments = sourceWithoutSingleLineComments.replace(/\/\*[\s\S]*?\*\//g, "");
        const thenPattern = /\.then\s*\(/g;
        const matches = sourceWithoutComments.match(thenPattern);
        expect(matches).toBeNull();
    });
    it("migrate.ts contains no .catch( calls", () => {
        const source = readSource(MIGRATE_TS_PATH);
        const sourceWithoutSingleLineComments = source
            .split("\n")
            .map((line) => line.replace(/(?<!https?:)\/\/.*$/, ""))
            .join("\n");
        const sourceWithoutComments = sourceWithoutSingleLineComments.replace(/\/\*[\s\S]*?\*\//g, "");
        const catchPattern = /\.catch\s*\(/g;
        const matches = sourceWithoutComments.match(catchPattern);
        expect(matches).toBeNull();
    });
    it("migrate.ts uses the async keyword on runMigrations", () => {
        const source = readSource(MIGRATE_TS_PATH);
        // The exported function must still be async
        expect(source).toMatch(/export\s+async\s+function\s+runMigrations/);
    });
    it("migrate.ts uses await keyword (not .then chains) for async operations", () => {
        const source = readSource(MIGRATE_TS_PATH);
        // There must be at least one await expression, confirming async/await usage
        expect(source).toMatch(/\bawait\b/);
    });
    it("migrate.ts uses try/catch for error handling (not .catch chains)", () => {
        const source = readSource(MIGRATE_TS_PATH);
        // There must be at least one try { ... } catch block
        expect(source).toMatch(/\btry\s*\{/);
        expect(source).toMatch(/\}\s*catch\s*\(/);
    });
    it("migrate.ts standalone execution block does not use .then(", () => {
        const source = readSource(MIGRATE_TS_PATH);
        // The standalone execution section (isMain block) must not use .then(
        // Extract the isMain block (everything after the isMain declaration)
        const isMainIndex = source.indexOf("isMain");
        expect(isMainIndex).toBeGreaterThan(-1);
        const isMainSection = source.slice(isMainIndex);
        // Strip comments
        const cleaned = isMainSection
            .split("\n")
            .map((line) => line.replace(/(?<!https?:)\/\/.*$/, ""))
            .join("\n")
            .replace(/\/\*[\s\S]*?\*\//g, "");
        expect(cleaned).not.toMatch(/\.then\s*\(/);
    });
    it("migrate.ts standalone execution block does not use .catch(", () => {
        const source = readSource(MIGRATE_TS_PATH);
        const isMainIndex = source.indexOf("isMain");
        expect(isMainIndex).toBeGreaterThan(-1);
        const isMainSection = source.slice(isMainIndex);
        const cleaned = isMainSection
            .split("\n")
            .map((line) => line.replace(/(?<!https?:)\/\/.*$/, ""))
            .join("\n")
            .replace(/\/\*[\s\S]*?\*\//g, "");
        expect(cleaned).not.toMatch(/\.catch\s*\(/);
    });
    it("migrate.ts standalone execution uses await (async IIFE or top-level await)", () => {
        const source = readSource(MIGRATE_TS_PATH);
        // The isMain block must use await to call runMigrations
        const isMainIndex = source.indexOf("isMain");
        expect(isMainIndex).toBeGreaterThan(-1);
        const isMainSection = source.slice(isMainIndex);
        // Must contain an await for runMigrations
        expect(isMainSection).toMatch(/\bawait\s+runMigrations\b/);
    });
});
//# sourceMappingURL=migrate-async-await.test.js.map