/**
 * env.ts — Validated environment configuration.
 *
 * Reads process.env at module load time, validates all required variables are
 * present, and throws a descriptive error at startup if any are missing.
 * Consuming packages should import `env` and never read process.env directly.
 */
const REQUIRED_VARS = [
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_ALLOWED_CHAT_ID",
    "ANTHROPIC_API_KEY",
    "DATABASE_URL",
    "STRAVA_CLIENT_ID",
    "STRAVA_CLIENT_SECRET",
    "STRAVA_REDIRECT_URI",
    "DIGEST_CRON",
    "TZ",
];
const OPTIONAL_DEFAULTS = {
    ANTHROPIC_MODEL: "claude-sonnet-4-20250514",
    TODOIST_API_TOKEN: "",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GOOGLE_REFRESH_TOKEN: "",
    BOT_MODE: "polling",
    LOG_LEVEL: "info",
    ORCHESTRATOR_URL: "http://localhost:3001",
    PORT: "3001",
};
function loadEnv() {
    const missing = [];
    for (const key of REQUIRED_VARS) {
        const value = process.env[key];
        if (value === undefined || value.trim() === "") {
            missing.push(key);
        }
    }
    if (missing.length > 0) {
        throw new Error(`[env] Missing required environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. ` +
            `Check your .env file against .env.example.`);
    }
    const raw = (key) => {
        const value = process.env[key];
        if (value !== undefined && value.trim() !== "") {
            return value.trim();
        }
        const def = OPTIONAL_DEFAULTS[key];
        if (def !== undefined) {
            return def;
        }
        // Should never happen for optional vars without defaults, but be safe
        return "";
    };
    const botMode = raw("BOT_MODE");
    if (botMode !== "polling" && botMode !== "webhook") {
        throw new Error(`[env] BOT_MODE must be "polling" or "webhook", got: "${botMode}"`);
    }
    return {
        TELEGRAM_BOT_TOKEN: raw("TELEGRAM_BOT_TOKEN"),
        TELEGRAM_ALLOWED_CHAT_ID: raw("TELEGRAM_ALLOWED_CHAT_ID"),
        ANTHROPIC_API_KEY: raw("ANTHROPIC_API_KEY"),
        ANTHROPIC_MODEL: raw("ANTHROPIC_MODEL"),
        DATABASE_URL: raw("DATABASE_URL"),
        ORCHESTRATOR_URL: raw("ORCHESTRATOR_URL"),
        TODOIST_API_TOKEN: raw("TODOIST_API_TOKEN"),
        GOOGLE_CLIENT_ID: raw("GOOGLE_CLIENT_ID"),
        GOOGLE_CLIENT_SECRET: raw("GOOGLE_CLIENT_SECRET"),
        GOOGLE_REFRESH_TOKEN: raw("GOOGLE_REFRESH_TOKEN"),
        STRAVA_CLIENT_ID: raw("STRAVA_CLIENT_ID"),
        STRAVA_CLIENT_SECRET: raw("STRAVA_CLIENT_SECRET"),
        STRAVA_REDIRECT_URI: raw("STRAVA_REDIRECT_URI"),
        DIGEST_CRON: raw("DIGEST_CRON"),
        TZ: raw("TZ"),
        BOT_MODE: botMode,
        LOG_LEVEL: raw("LOG_LEVEL"),
        PORT: raw("PORT"),
    };
}
export const env = loadEnv();
//# sourceMappingURL=env.js.map