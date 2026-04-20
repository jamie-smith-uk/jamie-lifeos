/**
 * Tests for task: replace-promise-chains-with-async-await
 *
 * Acceptance criteria:
 *   AC1: index.ts has no .then()/.catch() chains — uses await/try/catch instead
 *   AC2: tsc --noEmit passes with no errors
 *   AC3: pnpm test passes with no failures (verified by this suite itself passing)
 *
 * Strategy
 * --------
 * These are static source-analysis tests. They read the raw TypeScript source
 * of index.ts and assert that the promise-chain patterns (.then / .catch) are
 * absent from the application code. The tests are intentionally RED before the
 * refactoring is applied.
 *
 * Known promise chains in the current (pre-refactor) source:
 *   1. sendTypingIndicator() — fetch(...).then(...).catch(...)
 *                            — nested res.text().catch(...).then(...)
 *   2. http.createServer callback — requestHandler(...).catch(...)
 *   3. Module-level bootstrap — main().catch(...)
 *
 * All three must be eliminated in favour of async/await + try/catch.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// Resolve the path to the source file under test
// ---------------------------------------------------------------------------

const _thisDir = path.dirname(fileURLToPath(import.meta.url));

// __tests__/ is inside packages/orchestrator/src/
const INDEX_TS_PATH = path.resolve(_thisDir, "..", "index.ts");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSource(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Strip single-line and block comments from TypeScript source so that
 * commented-out code does not cause false negatives in the pattern checks.
 */
function stripComments(source: string): string {
  // Strip single-line comments (// ...) — skip http(s):// patterns
  const withoutSingleLine = source
    .split("\n")
    .map((line) => line.replace(/(?<!https?:)\/\/.*$/, ""))
    .join("\n");

  // Strip block comments (/* ... */ and /** ... */)
  return withoutSingleLine.replace(/\/\*[\s\S]*?\*\//g, "");
}

// ---------------------------------------------------------------------------
// AC1 — index.ts must not contain .then() or .catch() chains
// ---------------------------------------------------------------------------

describe("AC1 — index.ts uses async/await, not .then()/.catch() chains", () => {
  it("index.ts source file exists", () => {
    expect(fs.existsSync(INDEX_TS_PATH)).toBe(true);
  });

  it("index.ts contains no .then( calls", () => {
    const source = readSource(INDEX_TS_PATH);
    const cleaned = stripComments(source);

    const thenPattern = /\.then\s*\(/g;
    const matches = cleaned.match(thenPattern);

    // Provide helpful failure message listing all matches
    if (matches) {
      // Find line numbers for each match to aid debugging
      const lines = cleaned.split("\n");
      const matchingLines = lines
        .map((line, i) => ({ line, num: i + 1 }))
        .filter(({ line }) => /\.then\s*\(/.test(line))
        .map(({ line, num }) => `  Line ${num}: ${line.trim()}`)
        .join("\n");
      throw new Error(
        `index.ts still contains .then( chains:\n${matchingLines}`,
      );
    }

    expect(matches).toBeNull();
  });

  it("index.ts contains no .catch( calls", () => {
    const source = readSource(INDEX_TS_PATH);
    const cleaned = stripComments(source);

    const catchPattern = /\.catch\s*\(/g;
    const matches = cleaned.match(catchPattern);

    if (matches) {
      const lines = cleaned.split("\n");
      const matchingLines = lines
        .map((line, i) => ({ line, num: i + 1 }))
        .filter(({ line }) => /\.catch\s*\(/.test(line))
        .map(({ line, num }) => `  Line ${num}: ${line.trim()}`)
        .join("\n");
      throw new Error(
        `index.ts still contains .catch( chains:\n${matchingLines}`,
      );
    }

    expect(matches).toBeNull();
  });

  // -----------------------------------------------------------------------
  // sendTypingIndicator — must be refactored from .then/.catch to await
  // -----------------------------------------------------------------------

  it("sendTypingIndicator function does not use .then(", () => {
    const source = readSource(INDEX_TS_PATH);
    const cleaned = stripComments(source);

    // Extract the sendTypingIndicator function body
    const funcStart = cleaned.indexOf("function sendTypingIndicator");
    expect(funcStart).toBeGreaterThan(-1);

    // Find matching closing brace — naive but sufficient for a well-formatted file
    let depth = 0;
    let funcEnd = funcStart;
    let inFunc = false;
    for (let i = funcStart; i < cleaned.length; i++) {
      if (cleaned[i] === "{") {
        depth++;
        inFunc = true;
      } else if (cleaned[i] === "}") {
        depth--;
        if (inFunc && depth === 0) {
          funcEnd = i + 1;
          break;
        }
      }
    }

    const funcBody = cleaned.slice(funcStart, funcEnd);
    expect(funcBody).not.toMatch(/\.then\s*\(/);
  });

  it("sendTypingIndicator function does not use .catch(", () => {
    const source = readSource(INDEX_TS_PATH);
    const cleaned = stripComments(source);

    const funcStart = cleaned.indexOf("function sendTypingIndicator");
    expect(funcStart).toBeGreaterThan(-1);

    let depth = 0;
    let funcEnd = funcStart;
    let inFunc = false;
    for (let i = funcStart; i < cleaned.length; i++) {
      if (cleaned[i] === "{") {
        depth++;
        inFunc = true;
      } else if (cleaned[i] === "}") {
        depth--;
        if (inFunc && depth === 0) {
          funcEnd = i + 1;
          break;
        }
      }
    }

    const funcBody = cleaned.slice(funcStart, funcEnd);
    expect(funcBody).not.toMatch(/\.catch\s*\(/);
  });

  it("sendTypingIndicator uses await for the fetch call", () => {
    const source = readSource(INDEX_TS_PATH);

    const funcStart = source.indexOf("function sendTypingIndicator");
    expect(funcStart).toBeGreaterThan(-1);

    let depth = 0;
    let funcEnd = funcStart;
    let inFunc = false;
    for (let i = funcStart; i < source.length; i++) {
      if (source[i] === "{") {
        depth++;
        inFunc = true;
      } else if (source[i] === "}") {
        depth--;
        if (inFunc && depth === 0) {
          funcEnd = i + 1;
          break;
        }
      }
    }

    const funcBody = source.slice(funcStart, funcEnd);
    // After refactoring, either the function itself is async+await OR it
    // wraps the fire-and-forget in an async IIFE / void async arrow function
    expect(funcBody).toMatch(/\bawait\b/);
  });

  // -----------------------------------------------------------------------
  // http.createServer callback — must not use .catch on requestHandler
  // -----------------------------------------------------------------------

  it("http.createServer callback does not use .catch( on requestHandler", () => {
    const source = readSource(INDEX_TS_PATH);
    const cleaned = stripComments(source);

    // Find the createServer call and check its callback body
    const createServerIdx = cleaned.indexOf("http.createServer");
    expect(createServerIdx).toBeGreaterThan(-1);

    // Check the region around createServer (next ~20 lines) for .catch(
    const region = cleaned.slice(createServerIdx, createServerIdx + 600);
    expect(region).not.toMatch(/\.catch\s*\(/);
  });

  it("http.createServer callback does not use .then( on requestHandler", () => {
    const source = readSource(INDEX_TS_PATH);
    const cleaned = stripComments(source);

    const createServerIdx = cleaned.indexOf("http.createServer");
    expect(createServerIdx).toBeGreaterThan(-1);

    const region = cleaned.slice(createServerIdx, createServerIdx + 600);
    expect(region).not.toMatch(/\.then\s*\(/);
  });

  // -----------------------------------------------------------------------
  // Module-level bootstrap — main() must not use .catch(
  // -----------------------------------------------------------------------

  it("module-level main() invocation does not use .catch(", () => {
    const source = readSource(INDEX_TS_PATH);
    const cleaned = stripComments(source);

    // Find the last occurrence of main() (the call site at module level)
    const lastMainCall = cleaned.lastIndexOf("main()");
    expect(lastMainCall).toBeGreaterThan(-1);

    // Check the line containing main() for a .catch chain
    const region = cleaned.slice(lastMainCall, lastMainCall + 200);
    expect(region).not.toMatch(/\.catch\s*\(/);
  });

  it("module-level main() invocation does not use .then(", () => {
    const source = readSource(INDEX_TS_PATH);
    const cleaned = stripComments(source);

    const lastMainCall = cleaned.lastIndexOf("main()");
    expect(lastMainCall).toBeGreaterThan(-1);

    const region = cleaned.slice(lastMainCall, lastMainCall + 200);
    expect(region).not.toMatch(/\.then\s*\(/);
  });

  // -----------------------------------------------------------------------
  // Confirm async/await is used throughout
  // -----------------------------------------------------------------------

  it("index.ts uses async keyword on main function", () => {
    const source = readSource(INDEX_TS_PATH);
    expect(source).toMatch(/async\s+function\s+main\s*\(/);
  });

  it("index.ts uses async keyword on requestHandler function", () => {
    const source = readSource(INDEX_TS_PATH);
    expect(source).toMatch(/async\s+function\s+requestHandler\s*\(/);
  });

  it("index.ts uses async keyword on handleMessage function", () => {
    const source = readSource(INDEX_TS_PATH);
    expect(source).toMatch(/async\s+function\s+handleMessage\s*\(/);
  });

  it("index.ts uses async keyword on handleCallback function", () => {
    const source = readSource(INDEX_TS_PATH);
    expect(source).toMatch(/async\s+function\s+handleCallback\s*\(/);
  });

  it("index.ts uses try/catch for error handling in main", () => {
    const source = readSource(INDEX_TS_PATH);

    const mainStart = source.indexOf("async function main");
    expect(mainStart).toBeGreaterThan(-1);

    let depth = 0;
    let mainEnd = mainStart;
    let inFunc = false;
    for (let i = mainStart; i < source.length; i++) {
      if (source[i] === "{") {
        depth++;
        inFunc = true;
      } else if (source[i] === "}") {
        depth--;
        if (inFunc && depth === 0) {
          mainEnd = i + 1;
          break;
        }
      }
    }

    const mainBody = source.slice(mainStart, mainEnd);
    expect(mainBody).toMatch(/\btry\s*\{/);
    expect(mainBody).toMatch(/\}\s*catch\s*\(/);
  });

  it("index.ts uses try/catch in requestHandler for error handling", () => {
    const source = readSource(INDEX_TS_PATH);

    const handlerStart = source.indexOf("async function requestHandler");
    expect(handlerStart).toBeGreaterThan(-1);

    let depth = 0;
    let handlerEnd = handlerStart;
    let inFunc = false;
    for (let i = handlerStart; i < source.length; i++) {
      if (source[i] === "{") {
        depth++;
        inFunc = true;
      } else if (source[i] === "}") {
        depth--;
        if (inFunc && depth === 0) {
          handlerEnd = i + 1;
          break;
        }
      }
    }

    const handlerBody = source.slice(handlerStart, handlerEnd);
    expect(handlerBody).toMatch(/\btry\s*\{/);
    expect(handlerBody).toMatch(/\}\s*catch\s*\(/);
  });

  it("index.ts uses await keyword for runMigrations in main", () => {
    const source = readSource(INDEX_TS_PATH);

    const mainStart = source.indexOf("async function main");
    expect(mainStart).toBeGreaterThan(-1);

    let depth = 0;
    let mainEnd = mainStart;
    let inFunc = false;
    for (let i = mainStart; i < source.length; i++) {
      if (source[i] === "{") {
        depth++;
        inFunc = true;
      } else if (source[i] === "}") {
        depth--;
        if (inFunc && depth === 0) {
          mainEnd = i + 1;
          break;
        }
      }
    }

    const mainBody = source.slice(mainStart, mainEnd);
    expect(mainBody).toMatch(/\bawait\s+runMigrations\s*\(/);
  });
});
