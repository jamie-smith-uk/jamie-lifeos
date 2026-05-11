/**
 * T-22 — Railway service configuration and deployment
 *
 * Tests validate acceptance criteria statically by inspecting configuration
 * files in the repository. No live Railway, Telegram, Anthropic, or Docker
 * daemon connection is required.
 *
 * Acceptance criteria:
 *   AC-1  Both services deploy to Railway without build errors
 *         → railway.json references valid Dockerfiles with correct multi-stage
 *           structure, build context, and service configuration.
 *   AC-2  Bot service can reach orchestrator via ORCHESTRATOR_URL on Railway
 *         private network
 *         → ORCHESTRATOR_URL in bot service variables references the Railway
 *           orchestrator private domain.
 *   AC-3  All required environment variables documented in .env.example
 *         → DATABASE_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_ALLOWED_CHAT_ID,
 *           ANTHROPIC_API_KEY, ORCHESTRATOR_URL all present with descriptions.
 *   AC-4  No .env files committed to repository
 *         → git ls-files and .gitignore rules verified.
 */

import { strict as assert } from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { describe, it } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

function readFileSafe(rel) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) {
    throw new Error(`File not found: ${rel} (resolved to ${abs})`);
  }
  return readFileSync(abs, "utf8");
}

function fileExists(rel) {
  return existsSync(resolve(ROOT, rel));
}

// ---------------------------------------------------------------------------
// AC-1: Both services deploy to Railway without build errors
// ---------------------------------------------------------------------------

describe("AC-1: Railway and Dockerfile configuration is valid for deployment", () => {
  it("railway.json exists at the repository root", () => {
    assert.ok(fileExists("railway.json"), "railway.json not found at repo root");
  });

  it("railway.json parses as valid JSON", () => {
    const content = readFileSafe("railway.json");
    let parsed;
    assert.doesNotThrow(() => {
      parsed = JSON.parse(content);
    }, "railway.json is not valid JSON");
    assert.ok(parsed !== null && typeof parsed === "object");
  });

  it("railway.json declares a 'bot' service", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    assert.ok(
      config.services && config.services.bot,
      "No 'bot' service in railway.json"
    );
  });

  it("railway.json declares an 'orchestrator' service", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    assert.ok(
      config.services && config.services.orchestrator,
      "No 'orchestrator' service in railway.json"
    );
  });

  it("bot service uses DOCKERFILE builder", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    assert.equal(
      config.services.bot.build?.builder,
      "DOCKERFILE",
      "bot service builder is not DOCKERFILE"
    );
  });

  it("orchestrator service uses DOCKERFILE builder", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    assert.equal(
      config.services.orchestrator.build?.builder,
      "DOCKERFILE",
      "orchestrator service builder is not DOCKERFILE"
    );
  });

  it("bot Dockerfile path in railway.json points to existing file", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    const dockerfilePath = config.services.bot.build?.dockerfilePath;
    assert.ok(dockerfilePath, "bot dockerfilePath is not set in railway.json");
    assert.ok(
      fileExists(dockerfilePath),
      `Bot Dockerfile not found at ${dockerfilePath}`
    );
  });

  it("orchestrator Dockerfile path in railway.json points to existing file", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    const dockerfilePath = config.services.orchestrator.build?.dockerfilePath;
    assert.ok(dockerfilePath, "orchestrator dockerfilePath is not set in railway.json");
    assert.ok(
      fileExists(dockerfilePath),
      `Orchestrator Dockerfile not found at ${dockerfilePath}`
    );
  });

  it("packages/bot/Dockerfile exists", () => {
    assert.ok(
      fileExists("packages/bot/Dockerfile"),
      "packages/bot/Dockerfile not found"
    );
  });

  it("packages/orchestrator/Dockerfile exists", () => {
    assert.ok(
      fileExists("packages/orchestrator/Dockerfile"),
      "packages/orchestrator/Dockerfile not found"
    );
  });

  it("bot Dockerfile uses node:20-alpine base image", () => {
    const content = readFileSafe("packages/bot/Dockerfile");
    assert.match(
      content,
      /FROM node:20-alpine/,
      "bot Dockerfile does not use node:20-alpine"
    );
  });

  it("orchestrator Dockerfile uses node:20-alpine base image", () => {
    const content = readFileSafe("packages/orchestrator/Dockerfile");
    assert.match(
      content,
      /FROM node:20-alpine/,
      "orchestrator Dockerfile does not use node:20-alpine"
    );
  });

  it("bot Dockerfile is a multi-stage build (has AS builder stage)", () => {
    const content = readFileSafe("packages/bot/Dockerfile");
    assert.match(
      content,
      /AS builder/i,
      "bot Dockerfile does not have a multi-stage builder stage"
    );
  });

  it("orchestrator Dockerfile is a multi-stage build (has AS builder stage)", () => {
    const content = readFileSafe("packages/orchestrator/Dockerfile");
    assert.match(
      content,
      /AS builder/i,
      "orchestrator Dockerfile does not have a multi-stage builder stage"
    );
  });

  it("bot Dockerfile runs pnpm install --frozen-lockfile", () => {
    const content = readFileSafe("packages/bot/Dockerfile");
    assert.match(
      content,
      /pnpm install --frozen-lockfile/,
      "bot Dockerfile does not use pnpm install --frozen-lockfile"
    );
  });

  it("orchestrator Dockerfile runs pnpm install --frozen-lockfile", () => {
    const content = readFileSafe("packages/orchestrator/Dockerfile");
    assert.match(
      content,
      /pnpm install --frozen-lockfile/,
      "orchestrator Dockerfile does not use pnpm install --frozen-lockfile"
    );
  });

  it("bot Dockerfile CMD starts the bot service", () => {
    const content = readFileSafe("packages/bot/Dockerfile");
    assert.match(
      content,
      /CMD\s+\[.*packages\/bot\/dist\/index\.js/,
      "bot Dockerfile CMD does not start packages/bot/dist/index.js"
    );
  });

  it("orchestrator Dockerfile CMD starts the orchestrator service", () => {
    const content = readFileSafe("packages/orchestrator/Dockerfile");
    assert.match(
      content,
      /CMD\s+\[.*packages\/orchestrator\/dist\/index\.js/,
      "orchestrator Dockerfile CMD does not start packages/orchestrator/dist/index.js"
    );
  });

  it("bot Dockerfile build context is set to '.' (monorepo root) in railway.json", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    assert.equal(
      config.services.bot.build?.buildContext,
      ".",
      "bot buildContext is not '.'"
    );
  });

  it("orchestrator Dockerfile build context is set to '.' (monorepo root) in railway.json", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    assert.equal(
      config.services.orchestrator.build?.buildContext,
      ".",
      "orchestrator buildContext is not '.'"
    );
  });

  it("bot Dockerfile runs as non-root user", () => {
    const content = readFileSafe("packages/bot/Dockerfile");
    assert.match(
      content,
      /USER\s+\S+/,
      "bot Dockerfile does not switch to a non-root user"
    );
    assert.doesNotMatch(
      content,
      /USER\s+root/,
      "bot Dockerfile switches to root user"
    );
  });

  it("orchestrator Dockerfile runs as non-root user", () => {
    const content = readFileSafe("packages/orchestrator/Dockerfile");
    assert.match(
      content,
      /USER\s+\S+/,
      "orchestrator Dockerfile does not switch to a non-root user"
    );
    assert.doesNotMatch(
      content,
      /USER\s+root/,
      "orchestrator Dockerfile switches to root user"
    );
  });

  it("orchestrator service has restart policy ON_FAILURE in railway.json", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    assert.equal(
      config.services.orchestrator.deploy?.restartPolicyType,
      "ON_FAILURE",
      "orchestrator restartPolicyType is not ON_FAILURE"
    );
  });

  it("bot service has restart policy ON_FAILURE in railway.json", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    assert.equal(
      config.services.bot.deploy?.restartPolicyType,
      "ON_FAILURE",
      "bot restartPolicyType is not ON_FAILURE"
    );
  });
});

// ---------------------------------------------------------------------------
// AC-2: Bot service can reach orchestrator via ORCHESTRATOR_URL on Railway
//       private network
// ---------------------------------------------------------------------------

describe("AC-2: Bot service ORCHESTRATOR_URL references Railway private network", () => {
  it("bot service variables include ORCHESTRATOR_URL in railway.json", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    const vars = config.services.bot.variables ?? {};
    assert.ok(
      "ORCHESTRATOR_URL" in vars,
      "ORCHESTRATOR_URL not in bot service variables"
    );
  });

  it("ORCHESTRATOR_URL value references orchestrator Railway private domain", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    const vars = config.services.bot.variables ?? {};
    const value = vars.ORCHESTRATOR_URL;
    assert.match(
      value,
      /orchestrator/i,
      `ORCHESTRATOR_URL value '${value}' does not reference orchestrator service`
    );
    assert.match(
      value,
      /\$\{\{.+\}\}/,
      `ORCHESTRATOR_URL value '${value}' is not a Railway variable reference`
    );
  });

  it("orchestrator service exposes healthcheck endpoint in railway.json", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    const healthcheck = config.services.orchestrator.deploy?.healthcheckPath;
    assert.ok(
      healthcheck,
      "orchestrator healthcheckPath is not set in railway.json"
    );
    assert.ok(
      healthcheck.startsWith("/"),
      "healthcheckPath should be an absolute path"
    );
  });

  it("orchestrator service sets PORT variable in railway.json", () => {
    const config = JSON.parse(readFileSafe("railway.json"));
    const vars = config.services.orchestrator.variables ?? {};
    assert.ok("PORT" in vars, "PORT not in orchestrator service variables");
  });
});

// ---------------------------------------------------------------------------
// AC-3: All required environment variables documented in .env.example
// ---------------------------------------------------------------------------

describe("AC-3: Required environment variables are documented in .env.example", () => {
  it(".env.example file exists", () => {
    assert.ok(fileExists(".env.example"), ".env.example not found");
  });

  const requiredVars = [
    "DATABASE_URL",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_ALLOWED_CHAT_ID",
    "ANTHROPIC_API_KEY",
    "ORCHESTRATOR_URL",
  ];

  for (const varName of requiredVars) {
    it(`.env.example defines ${varName}`, () => {
      const content = readFileSafe(".env.example");
      const regex = new RegExp(`^${varName}=`, "m");
      assert.match(content, regex, `.env.example does not define ${varName}`);
    });

    it(`.env.example has a description comment for ${varName}`, () => {
      const content = readFileSafe(".env.example");
      const lines = content.split("\n");
      const varLineIndex = lines.findIndex((l) =>
        l.startsWith(`${varName}=`)
      );
      assert.ok(varLineIndex > 0, `${varName} not found in .env.example`);
      // There must be at least one comment line (starts with #, non-empty)
      // within the 5 lines preceding the assignment
      const precedingLines = lines.slice(
        Math.max(0, varLineIndex - 5),
        varLineIndex
      );
      const hasComment = precedingLines.some(
        (l) => l.startsWith("#") && l.trim().length > 1
      );
      assert.ok(
        hasComment,
        `No description comment found before ${varName} in .env.example`
      );
    });
  }

  it(".env.example DATABASE_URL uses postgresql:// scheme", () => {
    const content = readFileSafe(".env.example");
    assert.match(
      content,
      /DATABASE_URL=postgresql:\/\//,
      "DATABASE_URL in .env.example does not use postgresql:// scheme"
    );
  });

  it(".env.example ORCHESTRATOR_URL uses http scheme and localhost default", () => {
    const content = readFileSafe(".env.example");
    assert.match(
      content,
      /ORCHESTRATOR_URL=http/,
      "ORCHESTRATOR_URL in .env.example does not use http scheme"
    );
  });
});

// ---------------------------------------------------------------------------
// AC-4: No .env files committed to repository
// ---------------------------------------------------------------------------

describe("AC-4: No .env files are committed to the repository", () => {
  it(".gitignore exists and ignores .env files", () => {
    assert.ok(fileExists(".gitignore"), ".gitignore not found");
    const content = readFileSafe(".gitignore");
    assert.match(content, /^\.env$/m, ".gitignore does not ignore .env");
  });

  it(".gitignore ignores .env.* variants", () => {
    const content = readFileSafe(".gitignore");
    assert.match(
      content,
      /\.env\.\*/m,
      ".gitignore does not ignore .env.* variants"
    );
  });

  it(".gitignore explicitly excludes .env.example from gitignore", () => {
    const content = readFileSafe(".gitignore");
    assert.match(
      content,
      /!\.env\.example/,
      ".gitignore does not have !.env.example exception"
    );
  });

  it("no .env files (other than .env.example) are tracked by git", () => {
    const output = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" });
    const trackedFiles = output.trim().split("\n");
    const envFiles = trackedFiles.filter(
      (f) => f.match(/\.env/) && f !== ".env.example"
    );
    assert.deepEqual(
      envFiles,
      [],
      `The following .env files are tracked by git: ${envFiles.join(", ")}`
    );
  });

  it(".env.example is tracked by git (it should be committed)", () => {
    const output = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" });
    const trackedFiles = output.trim().split("\n");
    assert.ok(
      trackedFiles.includes(".env.example"),
      ".env.example is not tracked by git"
    );
  });

  it("no .env file exists at the repository root committed to git", () => {
    const output = execSync("git ls-files .env", {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(
      output.trim(),
      "",
      ".env is tracked by git — this must not be committed"
    );
  });
});
