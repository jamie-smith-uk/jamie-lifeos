/**
 * Tests for .env.example — documentation of all environment variables.
 *
 * Verifies that all required Strava environment variables are documented
 * in the .env.example file.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";

describe(".env.example — Strava variables documentation", () => {
  let envExampleContent: string;

  beforeEach(() => {
    const envExamplePath = resolve(process.cwd(), "../../.env.example");
    envExampleContent = readFileSync(envExamplePath, "utf-8");
  });

  it("documents STRAVA_CLIENT_ID in .env.example", () => {
    expect(envExampleContent).toMatch(/STRAVA_CLIENT_ID/);
  });

  it("documents STRAVA_CLIENT_SECRET in .env.example", () => {
    expect(envExampleContent).toMatch(/STRAVA_CLIENT_SECRET/);
  });

  it("documents STRAVA_REDIRECT_URI in .env.example", () => {
    expect(envExampleContent).toMatch(/STRAVA_REDIRECT_URI/);
  });

  it("includes all three Strava variables in .env.example", () => {
    const hasClientId = envExampleContent.includes("STRAVA_CLIENT_ID");
    const hasClientSecret = envExampleContent.includes("STRAVA_CLIENT_SECRET");
    const hasRedirectUri = envExampleContent.includes("STRAVA_REDIRECT_URI");

    expect(hasClientId && hasClientSecret && hasRedirectUri).toBe(true);
  });
});
