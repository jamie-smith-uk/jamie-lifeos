#!/usr/bin/env node

/**
 * run-task.ts — Run a single ad-hoc task through the agent pipeline.
 *
 * For bug fixes, backlog items, hotfixes, and small features that don't
 * warrant a full PRD phase. Uses the same quality gates as the phase pipeline.
 *
 * Usage:
 *   pnpm --filter @lifeos/orchestrator exec tsx src/run-task.ts backlog/fix.md
 *   pnpm --filter @lifeos/orchestrator exec tsx src/run-task.ts --quick "Fix the crash"
 *   pnpm --filter @lifeos/orchestrator exec tsx src/run-task.ts --help
 */

import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import readline from "node:readline";
import { spawnSync } from "node:child_process";

import { loadEnv, log } from "./config.js";
import { halt } from "./halt.js";
import {
  verifyImplementation,
  checkScopeCompliance,
  revertScopeViolations,
  reportPasses,
  getAffectedPkgFilter,
  getExpandedFileList,
} from "./gates.js";
import { runAgent } from "./agent.js";
import { tryFixer } from "./phases/fixer.js";
import { runCodeHealthChecks } from "./checks/health.js";
import { runMutationTests } from "./checks/mutation.js";
import {
  checkTesterTrajectory,
  checkSecurityTrajectory,
} from "./checks/trajectory.js";
import {
  recordTaskMetrics,
  recordSecurityFindings,
} from "./metrics.js";
import type { PipelineConfig, Task } from "./types.js";

// ── Arg parsing ───────────────────────────────────────────────────────────────

interface TaskRunnerOptions {
  taskFile: string;
  quickDesc: string;
  jsonInline: string;
  review: boolean;
  noSecurity: boolean;
  urgent: boolean;
  dryRun: boolean;
}

function parseArgs(): TaskRunnerOptions {
  const args = process.argv.slice(2);
  const opts: TaskRunnerOptions = {
    taskFile: "",
    quickDesc: "",
    jsonInline: "",
    review: false,
    noSecurity: false,
    urgent: false,
    dryRun: false,
  };

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`Usage: tsx src/run-task.ts [OPTIONS] [task-file.md]

Inputs (one required):
  task-file.md              Task file with YAML front matter (see backlog/)
  --quick "description"     Natural language — AI generates the spec
  --json '{...}'            Inline task JSON

Options:
  --review       Show task spec and ask for approval before running
  --no-security  Skip AG-07 Security (for non-code changes, docs, config)
  --urgent       Skip Refactor and Mutation testing (hotfix mode)
  --dry-run      Print the manifest and exit without running agents

Task file format (backlog/my-task.md):
  ---
  title: Fix message handler crash on long input
  security_sensitive: false
  files:
    - src/handlers/message.ts
  criteria:
    - Messages over 4000 chars are truncated cleanly
    - A warning is logged when truncation occurs
  ---
  ## Context (optional)
  ...`);
    process.exit(0);
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--review":      opts.review = true; break;
      case "--no-security": opts.noSecurity = true; break;
      case "--urgent":      opts.urgent = true; break;
      case "--dry-run":     opts.dryRun = true; break;
      case "--quick":       opts.quickDesc = args[++i] ?? ""; break;
      case "--json":        opts.jsonInline = args[++i] ?? ""; break;
      default:
        if (args[i].startsWith("-")) {
          console.error(`Unknown option: ${args[i]}`);
          process.exit(1);
        }
        opts.taskFile = args[i];
    }
  }

  return opts;
}

// ── Task input resolution ─────────────────────────────────────────────────────

function parseTaskFile(filePath: string): Task {
  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)/);
  if (!match) throw new Error(`No YAML front matter found in ${filePath}`);

  const [, frontmatter, body] = match;
  const result: Record<string, unknown> = {};
  let currentList: string[] | null = null;

  for (const line of frontmatter.split("\n")) {
    if (/^  - /.test(line)) {
      currentList?.push(line.slice(4).trim());
    } else if (line.includes(":")) {
      const colonIdx = line.indexOf(":");
      const k = line.slice(0, colonIdx).trim();
      const v = line.slice(colonIdx + 1).trim();
      if (v === "") {
        result[k] = [];
        currentList = result[k] as string[];
      } else if (v.toLowerCase() === "true") {
        result[k] = true; currentList = null;
      } else if (v.toLowerCase() === "false") {
        result[k] = false; currentList = null;
      } else {
        result[k] = v; currentList = null;
      }
    }
  }

  const title = String(result.title ?? "Unnamed task");
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

  return {
    id: slug,
    title,
    description: body?.trim().slice(0, 500) || title,
    files_in_scope: (result.files ?? result.files_in_scope ?? []) as string[],
    dependencies: [],
    acceptance_criteria: (result.criteria ?? result.acceptance_criteria ?? []) as string[],
    security_sensitive: Boolean(result.security_sensitive),
    estimated_complexity: (result.complexity as Task["estimated_complexity"]) ?? "medium",
  };
}

async function generateTaskFromDescription(description: string, repoRoot: string): Promise<Task> {
  log("Generating task manifest from description...");

  const listingResult = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: repoRoot, encoding: "utf8", timeout: 5000 },
  );
  const listing = (listingResult.stdout ?? "").slice(0, 2000);

  const prompt =
    `You are a software architect. Given this task description and repo file listing, ` +
    `produce a task manifest JSON object.\n\n` +
    `Task: ${description}\n\nRepo files:\n${listing}\n\n` +
    `Reply with ONLY valid JSON:\n` +
    `{"id":"kebab-slug","title":"Short title","description":"What to build",` +
    `"files_in_scope":["path/to/file.ts"],"dependencies":[],` +
    `"acceptance_criteria":["Specific testable criterion"],` +
    `"security_sensitive":false,"estimated_complexity":"low|medium|high"}`;

  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const body = JSON.stringify({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data) as { content: Array<{ text: string }> };
            const text = parsed.content[0].text.trim();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON in response");
            resolve(JSON.parse(jsonMatch[0]) as Task);
          } catch (e) {
            reject(new Error(`Failed to parse Architect response: ${e}`));
          }
        });
      },
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Review gate ───────────────────────────────────────────────────────────────

async function promptReview(task: Task): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("\n════════════════════════════════════════════════════════");
  console.log("  TASK REVIEW");
  console.log("════════════════════════════════════════════════════════");
  console.log(`  Title:    ${task.title}`);
  console.log(`  Files:    ${task.files_in_scope.join(", ")}`);
  console.log(`  Security: ${task.security_sensitive}`);
  console.log("");
  console.log("  Criteria:");
  for (const c of task.acceptance_criteria) {
    console.log(`    • ${c}`);
  }
  console.log("");

  return new Promise((resolve) => {
    rl.question("  approve | stop > ", (answer) => {
      rl.close();
      resolve(/^(approve|yes|y)$/i.test(answer.trim()));
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasMigrationFiles(filesInScope: string[]): boolean {
  return filesInScope.some(
    (f) => f.toLowerCase().includes("migration") || f.startsWith("migrations/"),
  );
}

function cleanTempFiles(repoRoot: string): void {
  for (const pattern of ["debug-*.js","debug-*.ts","test-*.js","test-*.ts","*.debug.js","*.debug.ts","*.tmp","*.scratch.*"]) {
    spawnSync("find", [repoRoot, "-maxdepth", "2", "-name", pattern,
      "-not", "-path", "*/node_modules/*",
      "-not", "-path", "*/__tests__/*",
      "-not", "-path", "*/pipeline/*",
      "-delete"], { encoding: "utf8" });
  }
}

function autoFixBiome(repoRoot: string, filesInScope: string[]): void {
  const existing = filesInScope.map((f) => path.join(repoRoot, f)).filter(fs.existsSync);
  if (existing.length === 0) return;
  spawnSync("pnpm", ["exec", "biome", "format", "--write", ...existing], {
    cwd: repoRoot, encoding: "utf8",
  });
}

function checkInScopeChanged(repoRoot: string, filesInScope: string[]): boolean {
  const result = spawnSync("git", ["-C", repoRoot, "diff", "--name-only", "HEAD"], { encoding: "utf8" });
  const changed = new Set((result.stdout ?? "").split("\n").filter(Boolean));
  return filesInScope.some((f) => changed.has(f));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseArgs();

  // Derive repo root from this file: orchestrator/src/run-task.ts → ../../..
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const repoRoot = path.resolve(scriptDir, "../../..");

  loadEnv(repoRoot);

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — check your .env");
  }

  if (!process.env.DATABASE_URL && process.env.POSTGRES_USER) {
    const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB } = process.env;
    process.env.DATABASE_URL = `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;
  }

  // ── Resolve task ────────────────────────────────────────────────────────────
  let task: Task;
  if (opts.quickDesc) {
    task = await generateTaskFromDescription(opts.quickDesc, repoRoot);
  } else if (opts.jsonInline) {
    task = JSON.parse(opts.jsonInline) as Task;
  } else if (opts.taskFile) {
    if (!fs.existsSync(opts.taskFile)) {
      console.error(`Task file not found: ${opts.taskFile}`);
      process.exit(1);
    }
    task = parseTaskFile(opts.taskFile);
  } else {
    console.error("Error: provide a task file, --quick description, or --json payload.");
    console.error("Run with --help for usage.");
    process.exit(1);
  }

  const filesInScopeJson = JSON.stringify(task.files_in_scope);
  const affectedPkgs = getAffectedPkgFilter(filesInScopeJson);
  const filesExpanded = getExpandedFileList(filesInScopeJson);
  const pkgTestCmd = affectedPkgs ? `pnpm ${affectedPkgs} test` : "pnpm test";
  const taskSpec = `<task-spec>\n${JSON.stringify(task, null, 2)}\n</task-spec>`;
  const hasMigration = hasMigrationFiles(task.files_in_scope);

  // ── Task directory ──────────────────────────────────────────────────────────
  const slug = task.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const taskDir = path.join(repoRoot, "pipeline", "tasks", `${slug}-${timestamp}`);
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(path.join(taskDir, "task.json"), JSON.stringify(task, null, 2));

  // Minimal PipelineConfig for shared utilities
  const cfg: PipelineConfig = {
    phase: "tasks",
    repoRoot,
    pipelineDir: taskDir,
    agentsDir: path.join(repoRoot, ".opencode", "agents"),
    phaseStartedAt: new Date().toISOString(),
    contextMaxChars: 4000,
    archDocMaxChars: 6000,
  };

  // ── Dry run ─────────────────────────────────────────────────────────────────
  if (opts.dryRun) {
    console.log("\nTask manifest:");
    console.log(JSON.stringify(task, null, 2));
    const pipeline = ["RED", "GREEN"];
    if (hasMigration) pipeline.push("MIGRATION");
    if (!opts.urgent) pipeline.push("REFACTOR");
    if (task.security_sensitive && !opts.urgent) pipeline.push("MUTATION");
    if (!opts.noSecurity) pipeline.push("SECURITY");
    pipeline.push("COMMIT");
    console.log(`\nPipeline: ${pipeline.join(" → ")}`);
    return;
  }

  log("========================================");
  log(`Life OS — Task: ${task.title}`);
  log("========================================");
  const modeFlags = [opts.urgent && "URGENT", opts.noSecurity && "NO-SECURITY"].filter(Boolean);
  log(`Mode: ${modeFlags.length ? modeFlags.join(" ") : "standard"}`);
  log(`Dir:  ${taskDir}`);

  // ── Review gate ─────────────────────────────────────────────────────────────
  if (opts.review) {
    const approved = await promptReview(task);
    if (!approved) { log("Task stopped by user"); return; }
    log("Approved — starting implementation...");
  }

  // ── RED phase ───────────────────────────────────────────────────────────────
  const testsWrittenFile = path.join(taskDir, "tests-written.txt");
  if (!fs.existsSync(testsWrittenFile)) {
    const redStart = Math.floor(Date.now() / 1000);
    log("RED phase — Tester writing failing tests...");

    const redPrompt = `You are AG-03 Tester for Life OS.
RED phase of TDD — no implementation exists yet.
Write the test suite for this task:
${taskSpec}

Time budget: complete the RED phase in under 5 minutes. Read only the files
directly listed in files_in_scope and their immediate imports.

Write test files to __tests__/ directories.
After writing all tests, write 'tests-written' to: ${taskDir}/tests-written.txt
Do NOT write implementation code. Do NOT write test-report.md.`;

    runAgent("ag-03-tester", redPrompt, path.join(taskDir, "tester-red-output.md"), 0, taskDir);

    if (!fs.existsSync(testsWrittenFile)) {
      halt("Tester did not write tests", "AG-03", "tests-written.txt not found");
    }

    log("Confirming tests fail before implementation...");
    const redResult = spawnSync("pnpm", ["test"], {
      cwd: repoRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024,
    });
    const redOutput = `${redResult.stdout ?? ""}${redResult.stderr ?? ""}`;
    fs.writeFileSync(path.join(taskDir, "test-red-output.txt"), redOutput);

    if (redResult.status === 0) {
      log("WARNING: Tests pass before implementation — verify assertions are meaningful");
    } else {
      log("RED confirmed — tests fail as expected");
    }

    checkTesterTrajectory(repoRoot, taskDir, testsWrittenFile, task.acceptance_criteria.length);
    recordTaskMetrics(taskDir, task.id, task.title, "red",
      Math.floor(Date.now() / 1000) - redStart, 1, "pass", "tasks", cfg.phaseStartedAt);
  } else {
    log("RED already complete — skipping");
  }

  // ── GREEN phase ─────────────────────────────────────────────────────────────
  const greenVerifiedFile = path.join(taskDir, "green-verified.txt");
  if (!fs.existsSync(greenVerifiedFile)) {
    const greenStart = Math.floor(Date.now() / 1000);
    let devAttempts = 0;
    let greenPassed = false;
    let gateFailures = "";

    const baseDevPrompt = `You are AG-04 Developer for Life OS.
Implement this task to make the failing tests pass:
${taskSpec}

## Step 1 — Read the in-scope source files FIRST
Read the current content of every file listed in files_in_scope before writing anything.

## Step 2 — Read the tests
Read every .test.ts file in the __tests__/ directories of the in-scope packages.

## Biome lint rules — violations will fail the gate
- **noExplicitAny** (error): Never use \`any\`. Define typed interfaces or use \`unknown\`.
- **noExcessiveCognitiveComplexity** (error, max 10): Break complex logic into helpers.
- **noConsole** (warning): Use the logger from \`packages/shared/src/logger.ts\`.
- **Formatter**: Run \`biome check --write\` to auto-fix formatting.

## Validation commands (run in order before marking done)
\`\`\`bash
pnpm exec tsc --noEmit
pnpm exec biome check --write ${filesExpanded}
pnpm exec biome check ${filesExpanded}
${pkgTestCmd}
\`\`\`

Write self-assessment.md to ${taskDir}/
Apply all security rules. Use process.env.DATABASE_URL for DB connections.`;

    while (!greenPassed && devAttempts < 5) {
      devAttempts++;
      log(`GREEN phase — Developer attempt ${devAttempts}/5...`);

      let devPrompt = baseDevPrompt;
      if (gateFailures) {
        const diffResult = spawnSync("git", ["-C", repoRoot, "diff", "HEAD", "--", ...task.files_in_scope],
          { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
        const prevDiff = (diffResult.stdout ?? "").slice(0, 8000);
        devPrompt += `\n\n## Previous attempt failed — fix every item below:\n\n<gate-failures>\n${gateFailures}\n</gate-failures>`;
        if (prevDiff) {
          devPrompt += `\n\n<previous-attempt-diff>\n${prevDiff}\n</previous-attempt-diff>`;
        }
      }

      runAgent("ag-04-developer", devPrompt, path.join(taskDir, `dev-output-${devAttempts}.md`), 1200, taskDir);

      // Route BLOCKED.md through fixer before halting
      const blockedFile = path.join(taskDir, "BLOCKED.md");
      if (fs.existsSync(blockedFile)) {
        const blockedReason = fs.readFileSync(blockedFile, "utf8");
        log("Developer wrote BLOCKED.md — invoking fixer before halting");
        const fixerFailures = tryFixer(cfg, task, taskDir,
          `Developer blocked: ${blockedReason.slice(0, 200)}`,
          "AG-04", blockedReason, filesInScopeJson);
        if (fixerFailures) {
          halt(`Developer blocked on ${task.id} — fixer could not resolve`, "AG-04", blockedReason);
        }
        fs.unlinkSync(blockedFile);
        gateFailures = fixerFailures;
        continue;
      }

      cleanTempFiles(repoRoot);

      log("Checking files_in_scope compliance...");
      const scopeViolations = checkScopeCompliance(filesInScopeJson, repoRoot);
      let scopeGate = "";
      if (scopeViolations) {
        log("Scope violation — reverting out-of-scope changes...");
        revertScopeViolations(scopeViolations, repoRoot);
        scopeGate = `=== files_in_scope violation (changes reverted) ===\n${scopeViolations}\nOnly write to files listed in files_in_scope.`;
      }

      autoFixBiome(repoRoot, task.files_in_scope);

      log("Running hard gate (tsc + biome check + pnpm test)...");
      const implFailures = verifyImplementation(filesInScopeJson, repoRoot, path.join(taskDir, "baseline-failures.txt"));

      if (implFailures) {
        gateFailures = scopeGate ? `${scopeGate}\n${implFailures}` : implFailures;
      } else {
        gateFailures = "";
      }

      // False-green guard: scope violations reverted but no in-scope files written
      if (!gateFailures && scopeViolations && !checkInScopeChanged(repoRoot, task.files_in_scope)) {
        gateFailures = `${scopeGate}\n=== No in-scope files were modified ===\nYou MUST write implementation code to the files listed in files_in_scope.`;
      }

      if (!gateFailures) {
        greenPassed = true;
        fs.writeFileSync(greenVerifiedFile, "green-verified");
        fs.writeFileSync(path.join(taskDir, "test-report.md"),
          `Title: Test Report — ${task.id} — PASS\n\nVerified by hard gate after Developer attempt ${devAttempts}.\n\n- tsc --noEmit: PASS\n- biome check: PASS\n- pnpm test: PASS\n`);
        recordTaskMetrics(taskDir, task.id, task.title, "green",
          Math.floor(Date.now() / 1000) - greenStart, devAttempts, "pass", "tasks", cfg.phaseStartedAt);
        log("Code health (pre-refactor baseline):");
        runCodeHealthChecks(repoRoot, taskDir, task.id, taskDir, filesInScopeJson, "pre-refactor", true);
        log("GREEN phase: PASS");
      } else {
        log(`Hard gate: FAIL (attempt ${devAttempts}/5)`);
        fs.writeFileSync(path.join(taskDir, `gate-failures-${devAttempts}.txt`), gateFailures);

        if (devAttempts === 5) {
          const allFailures = [
            tryReadFile(path.join(taskDir, "gate-failures-1.txt")),
            tryReadFile(path.join(taskDir, "gate-failures-5.txt")),
          ].join("\n");
          gateFailures = tryFixer(cfg, task, taskDir,
            "Developer could not pass hard gate after 5 attempts",
            "AG-04", allFailures, filesInScopeJson);
          if (gateFailures) {
            halt("Developer and Fixer could not pass hard gate", "AG-04",
              `Task: ${task.id} — see ${taskDir}/fixer-output-*.md`);
          }
          greenPassed = true;
          fs.writeFileSync(greenVerifiedFile, "green-verified");
          fs.writeFileSync(path.join(taskDir, "test-report.md"),
            `Title: Test Report — ${task.id} — PASS\n\nVerified by Fixer after Developer attempt ${devAttempts}.\n`);
          recordTaskMetrics(taskDir, task.id, task.title, "green",
            Math.floor(Date.now() / 1000) - greenStart, devAttempts, "pass", "tasks", cfg.phaseStartedAt);
        }
      }
    }
  } else {
    log("GREEN already complete — skipping");
    if (!fs.existsSync(path.join(taskDir, "test-report.md"))) {
      fs.writeFileSync(path.join(taskDir, "test-report.md"),
        `Title: Test Report — ${task.id} — PASS\n\nRestored on resume.\n`);
    }
  }

  // ── MIGRATION phase (conditional) ───────────────────────────────────────────
  const migrationVerifiedFile = path.join(taskDir, "migration-verified.txt");
  if (hasMigration && !fs.existsSync(migrationVerifiedFile)) {
    const migStart = Math.floor(Date.now() / 1000);
    log("MIGRATION phase...");
    runAgent("ag-05-migration",
      `You are AG-05 Migration for Life OS.\nValidate migration files for: ${taskSpec}\nRun the migration and rollback. Write migration-report.md to ${taskDir}/`,
      path.join(taskDir, "migration-output.md"), 0, taskDir);
    const migReport = path.join(taskDir, "migration-report.md");
    if (!fs.existsSync(migReport)) halt("Migration report not written", "AG-05", "");
    if (!reportPasses(migReport)) halt("Migration failed", "AG-05", fs.readFileSync(migReport, "utf8"));
    fs.writeFileSync(migrationVerifiedFile, "migration-verified");
    recordTaskMetrics(taskDir, task.id, task.title, "migration",
      Math.floor(Date.now() / 1000) - migStart, 1, "pass", "tasks", cfg.phaseStartedAt);
    log("MIGRATION: PASS");
  } else if (hasMigration) {
    log("MIGRATION already complete — skipping");
  }

  // ── REFACTOR phase ──────────────────────────────────────────────────────────
  const refactorVerifiedFile = path.join(taskDir, "refactor-verified.txt");
  if (!opts.urgent && !fs.existsSync(refactorVerifiedFile)) {
    const refStart = Math.floor(Date.now() / 1000);
    log("REFACTOR phase...");

    // Check if health metrics are already clean (skip agent if so)
    const preHealthFile = path.join(taskDir, "health-report-pre.json");
    let metricsClean = false;
    if (fs.existsSync(preHealthFile)) {
      try {
        const health = JSON.parse(fs.readFileSync(preHealthFile, "utf8")) as {
          complex_functions?: unknown[];
          duplication_pct?: number;
        };
        const complexCount = health.complex_functions?.length ?? 99;
        const dupPct = health.duplication_pct ?? 99;
        metricsClean = complexCount < 5 && dupPct < 8.0;
      } catch { /* ignore */ }
    }

    if (metricsClean) {
      log("REFACTOR phase: metrics clean — skipping agent");
      fs.writeFileSync(path.join(taskDir, "refactor-report.md"),
        `# Refactor Report — ${task.id}\n\nSkipped: health metrics within thresholds.\n`);
    } else {
      runAgent("ag-06-refactor",
        `You are AG-06 Refactor for Life OS.\nImprove without changing behaviour: ${taskSpec}\n\nFiles in scope: ${filesExpanded}\n\n## Required: run validation before writing the report\n\`\`\`bash\npnpm exec tsc --noEmit\npnpm exec biome check --write ${filesExpanded}\npnpm exec biome check ${filesExpanded}\n${pkgTestCmd}\n\`\`\`\nDo not write refactor-report.md until all four pass.\nWrite refactor-report.md to ${taskDir}/`,
        path.join(taskDir, "refactor-output.md"), 0, taskDir);
      if (!fs.existsSync(path.join(taskDir, "refactor-report.md"))) {
        halt("Refactor report not written", "AG-06", "");
      }
    }

    const refactorFailures = verifyImplementation(filesInScopeJson, repoRoot);
    if (refactorFailures) halt("Refactor broke tests", "AG-06", refactorFailures);

    fs.writeFileSync(refactorVerifiedFile, "refactor-verified");
    recordTaskMetrics(taskDir, task.id, task.title, "refactor",
      Math.floor(Date.now() / 1000) - refStart, 1, "pass", "tasks", cfg.phaseStartedAt);
    log("Code health (post-refactor):");
    runCodeHealthChecks(repoRoot, taskDir, task.id, taskDir, filesInScopeJson, "", false);
    log("REFACTOR: PASS");
  } else if (opts.urgent) {
    log("REFACTOR skipped (--urgent)");
  } else {
    log("REFACTOR already complete — skipping");
  }

  // ── MUTATION TESTING ────────────────────────────────────────────────────────
  if (task.security_sensitive && !opts.urgent && !fs.existsSync(path.join(taskDir, "mutation-report.md"))) {
    const mutStart = Math.floor(Date.now() / 1000);
    log("MUTATION TESTING...");
    runMutationTests(repoRoot, task.id, taskDir, filesInScopeJson);
    recordTaskMetrics(taskDir, task.id, task.title, "mutation",
      Math.floor(Date.now() / 1000) - mutStart, 1, "pass", "tasks", cfg.phaseStartedAt);
    log("Mutation testing complete");
  }

  // ── SECURITY phase ──────────────────────────────────────────────────────────
  const secReport = path.join(taskDir, "security-report.md");
  if (!opts.noSecurity && !(fs.existsSync(secReport) && reportPasses(secReport))) {
    let securityPassed = false;
    let securityAttempts = 0;
    const secStart = Math.floor(Date.now() / 1000);
    const filesBulletList = task.files_in_scope.map((f) => `  - ${f}`).join("\n");

    while (!securityPassed && securityAttempts < 3) {
      securityAttempts++;
      log(`Security attempt ${securityAttempts}/3...`);

      runAgent("ag-07-security",
        `You are AG-07 Security Agent for Life OS.\n\nReview the code written for this task.\nTask spec:\n${taskSpec}\n\nFiles to review (read every one before writing findings):\n${filesBulletList}\n\nApply every rule in .opencode/agents/security-rules.md to every file listed above.\nWrite security-report.md to ${taskDir}/\nReturn PASS or FAIL with specific findings.`,
        path.join(taskDir, `sec-output-${securityAttempts}.md`), 0, taskDir);

      if (fs.existsSync(secReport) && reportPasses(secReport)) {
        securityPassed = true;
        recordTaskMetrics(taskDir, task.id, task.title, "security",
          Math.floor(Date.now() / 1000) - secStart, securityAttempts, "pass", "tasks", cfg.phaseStartedAt);
        recordSecurityFindings(taskDir, task.id, taskDir);
        checkSecurityTrajectory(repoRoot, taskDir);
        log("Security: PASS");
      } else {
        log(`Security: FAIL (attempt ${securityAttempts}/3)`);
        if (securityAttempts >= 3) {
          halt("Security failed after 3 attempts", "AG-07",
            fs.existsSync(secReport) ? fs.readFileSync(secReport, "utf8") : "(no report)");
        }

        const secFindings = fs.existsSync(secReport)
          ? fs.readFileSync(secReport, "utf8")
          : "(security-report.md not found)";

        runAgent("ag-04-developer",
          `You are AG-04 Developer for Life OS.\n\nThe Security Agent has rejected this task. Fix every finding below, then run all validation commands before marking done.\n\n<security-findings>\n${secFindings}\n</security-findings>\n\nTask spec for context:\n${taskSpec}\n\nFiles in scope (only modify these):\n${filesBulletList}\n\nDo not modify test files.\n\n## Validation commands — run all four before marking done\n\`\`\`bash\npnpm exec tsc --noEmit\npnpm exec biome check --write ${filesExpanded}\npnpm exec biome check ${filesExpanded}\n${pkgTestCmd}\n\`\`\`\nUse process.env.DATABASE_URL for DB connections.`,
          path.join(taskDir, `dev-secfix-${securityAttempts}.md`), 900, taskDir);

        const scopeViolations = checkScopeCompliance(filesInScopeJson, repoRoot);
        if (scopeViolations) revertScopeViolations(scopeViolations, repoRoot);
      }
    }
  } else if (opts.noSecurity) {
    log("Security skipped (--no-security)");
  } else {
    log("Security already passed — skipping");
  }

  // ── Git commit ──────────────────────────────────────────────────────────────
  log(`Committing ${task.id}...`);

  for (const f of task.files_in_scope) {
    const full = path.join(repoRoot, f);
    if (!fs.existsSync(full)) continue;
    const ignoreCheck = spawnSync("git", ["-C", repoRoot, "check-ignore", "-q", f], { encoding: "utf8" });
    if (ignoreCheck.status !== 0) {
      spawnSync("git", ["-C", repoRoot, "add", f], { encoding: "utf8" });
    }
  }

  // Also stage test files that correspond to in-scope source files
  for (const f of task.files_in_scope) {
    const base = path.basename(f, ".ts");
    const findResult = spawnSync("find", [repoRoot, "-path", `*/__tests__/${base}*`], { encoding: "utf8" });
    for (const tf of (findResult.stdout ?? "").split("\n").filter(Boolean)) {
      spawnSync("git", ["-C", repoRoot, "add", tf], { encoding: "utf8" });
    }
  }

  const diffCheck = spawnSync("git", ["-C", repoRoot, "diff", "--cached", "--quiet"], { encoding: "utf8" });
  if (diffCheck.status !== 0) {
    spawnSync("git", ["-C", repoRoot, "commit", "-m", `feat(${task.id}): ${task.title}`], { encoding: "utf8" });
    log(`Committed: feat(${task.id}): ${task.title}`);
  } else {
    log("Nothing new to commit");
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  process.stdout.write("\x07"); // terminal bell
  log("");
  log("========================================");
  log(`Task complete: ${task.title}`);
  log(`Output: ${taskDir}`);
  log("========================================");
}

function tryReadFile(filePath: string): string {
  try { return fs.readFileSync(filePath, "utf8"); } catch { return ""; }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
