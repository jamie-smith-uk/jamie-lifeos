import fs from "node:fs";
import path from "node:path";
import { log } from "../config.js";
import { runAgent } from "../agent.js";
import { halt } from "../halt.js";
import {
  reportPasses,
  verifyImplementation,
  checkScopeCompliance,
  revertScopeViolations,
  getAffectedPkgFilter,
  getExpandedFileList,
} from "../gates.js";
import { tryFixer } from "./fixer.js";
import { checkSecurityTrajectory } from "../checks/trajectory.js";
import { runMutationTests } from "../checks/mutation.js";
import { recordTaskMetrics, recordSecurityFindings } from "../metrics.js";
import type { PipelineConfig, Task } from "../types.js";

// ── runSecurityPhase() ────────────────────────────────────────────────────────

/**
 * SECURITY phase: AG-07 reviews the implementation.
 * Includes mutation testing for security-sensitive tasks.
 */
export function runSecurityPhase(
  cfg: PipelineConfig,
  task: Task,
  taskDir: string,
  contextBlock: string,
): void {
  const secReport = path.join(taskDir, "security-report.md");
  const secAttemptsFile = path.join(taskDir, "security-attempts.txt");

  const filesInScopeJson = JSON.stringify(task.files_in_scope);
  const filesExpanded = getExpandedFileList(filesInScopeJson);
  const affectedPkgs = getAffectedPkgFilter(filesInScopeJson);
  const pkgTestCmd = affectedPkgs ? `pnpm ${affectedPkgs} test` : "pnpm test";
  const taskSpec = `<task-spec>\n${JSON.stringify(task, null, 2)}\n</task-spec>`;
  const contextSection = contextBlock ? `\n${contextBlock}` : "";

  const filesBulletList = task.files_in_scope
    .map((f) => `  - ${f}`)
    .join("\n");

  let securityPassed = false;
  let securityAttempts = readSecurityAttempts(secAttemptsFile);
  const securityStart = Math.floor(Date.now() / 1000);
  const greenVerifiedFile = path.join(taskDir, "green-verified.txt");
  const refactorVerifiedFile = path.join(taskDir, "refactor-verified.txt");

  // ── Mutation testing (before security agent, for security-sensitive tasks) ──
  if (task.security_sensitive) {
    const mutationReport = path.join(taskDir, "mutation-report.md");
    if (!fs.existsSync(mutationReport)) {
      const mutationStart = Math.floor(Date.now() / 1000);
      log("MUTATION TESTING — task is security_sensitive...");
      runMutationTests(cfg.repoRoot, task.id, taskDir, filesInScopeJson);
      recordTaskMetrics(
        cfg.pipelineDir,
        task.id,
        task.title,
        "mutation",
        Math.floor(Date.now() / 1000) - mutationStart,
        1,
        "pass",
        cfg.phase,
        cfg.phaseStartedAt,
      );
      log("Mutation testing complete — see mutation-report.md");
    } else {
      log("MUTATION TESTING already complete — skipping");
    }
  }

  while (!securityPassed && securityAttempts < 3) {
    securityAttempts++;
    writeSecurityAttempts(secAttemptsFile, securityAttempts);
    log(`Security attempt ${securityAttempts}/3...`);

    const secPrompt = `You are AG-07 Security Agent for Life OS.

Review the code written for task ${task.id}.
Task spec:
${taskSpec}${contextSection}

Files to review (read every one before writing findings):
${filesBulletList}

Apply every rule in .opencode/agents/security-rules.md to every file listed above.
Write security-report.md to pipeline/phase-${cfg.phase}/${task.id}/
Return PASS or FAIL with specific findings.`;

    runAgent(
      "ag-07-security",
      secPrompt,
      path.join(taskDir, `sec-output-${securityAttempts}.md`),
      0,
      cfg.pipelineDir,
    );

    if (fs.existsSync(secReport) && reportPasses(secReport)) {
      securityPassed = true;
      recordTaskMetrics(
        cfg.pipelineDir,
        task.id,
        task.title,
        "security",
        Math.floor(Date.now() / 1000) - securityStart,
        securityAttempts,
        "pass",
        cfg.phase,
        cfg.phaseStartedAt,
      );
      recordSecurityFindings(cfg.pipelineDir, task.id, taskDir);
      checkSecurityTrajectory(cfg.repoRoot, taskDir);
      log("Security: PASS");
    } else {
      log(`Security: FAIL (attempt ${securityAttempts}/3)`);

      if (securityAttempts >= 3) {
        halt(
          "Security could not be resolved after 3 attempts",
          "AG-07",
          `Task: ${task.id} — see ${secReport}`,
        );
      }

      log("Security fix needed — re-running Developer...");

      const secFindings = fs.existsSync(secReport)
        ? fs.readFileSync(secReport, "utf8")
        : "(security-report.md not found)";

      const secFixPrompt = `You are AG-04 Developer for Life OS.

The Security Agent has rejected task ${task.id}. Fix every finding below, then run all
validation commands before marking done.

<security-findings>
${secFindings}
</security-findings>

Task spec for context:
${taskSpec}${contextSection}

Files in scope (only modify these):
${filesBulletList}

Do not modify test files.

## Validation commands — run all four before marking done
\`\`\`bash
pnpm exec tsc --noEmit
pnpm exec biome check --write ${filesExpanded}
pnpm exec biome check ${filesExpanded}
${pkgTestCmd}
\`\`\`
Fix everything before updating self-assessment.md.
Use process.env.DATABASE_URL for any database connections.`;

      runAgent(
        "ag-04-developer",
        secFixPrompt,
        path.join(taskDir, `dev-secfix-${securityAttempts}.md`),
        900,
        cfg.pipelineDir,
      );

      // Check scope compliance after security fix
      const scopeViolations = checkScopeCompliance(filesInScopeJson, cfg.repoRoot);
      if (scopeViolations) {
        log("Scope violation after security fix — reverting...");
        revertScopeViolations(scopeViolations, cfg.repoRoot);
      }

      // Re-run hard gate after security fix
      log("Re-running hard gate after security fix...");
      let postSecFailures = verifyImplementation(filesInScopeJson, cfg.repoRoot);

      if (postSecFailures && scopeViolations) {
        postSecFailures = `=== files_in_scope violation after security fix ===\n${scopeViolations}\n\n${postSecFailures}`;
      }

      if (postSecFailures) {
        postSecFailures = tryFixer(
          cfg,
          task,
          taskDir,
          "Security fix broke tsc or tests",
          "AG-07",
          postSecFailures,
          filesInScopeJson,
        );
        if (postSecFailures) {
          // Remove green and refactor markers before halting
          try { fs.unlinkSync(greenVerifiedFile); } catch { /* ignore */ }
          try { fs.unlinkSync(refactorVerifiedFile); } catch { /* ignore */ }
          halt(
            `Security fix broke tsc or tests on task ${task.id}`,
            "AG-07",
            `Task: ${task.id}\n${postSecFailures}`,
          );
        }
      }
      log("Post-security hard gate: PASS");
    }
  }
}

function readSecurityAttempts(file: string): number {
  try {
    return Number.parseInt(fs.readFileSync(file, "utf8").trim(), 10) || 0;
  } catch {
    return 0;
  }
}

function writeSecurityAttempts(file: string, n: number): void {
  fs.writeFileSync(file, String(n));
}
