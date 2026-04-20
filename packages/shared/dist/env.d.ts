/**
 * env.ts — Validated environment configuration.
 *
 * Reads process.env at module load time, validates all required variables are
 * present, and throws a descriptive error at startup if any are missing.
 * Consuming packages should import `env` and never read process.env directly.
 */
interface EnvConfig {
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_ALLOWED_CHAT_ID: string;
    ANTHROPIC_API_KEY: string;
    ANTHROPIC_MODEL: string;
    DATABASE_URL: string;
    ORCHESTRATOR_URL: string;
    GOOGLE_CALENDAR_MCP_TOKEN: string;
    DIGEST_CRON: string;
    TZ: string;
    BOT_MODE: "polling" | "webhook";
    LOG_LEVEL: string;
    PORT: string;
}
export declare const env: EnvConfig;
export type { EnvConfig };
//# sourceMappingURL=env.d.ts.map