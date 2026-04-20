/**
 * logger.ts — Structured pino logger shared across all packages.
 *
 * Level is controlled by the LOG_LEVEL environment variable (default: "info").
 * Valid levels: trace | debug | info | warn | error | fatal
 *
 * In production (NODE_ENV !== "development") the logger emits newline-delimited
 * JSON — ideal for Railway's log aggregation. In development it falls back to
 * the same JSON format so that the output is always machine-parseable; pipe
 * through `pino-pretty` locally if human-readable output is preferred.
 *
 * Usage:
 *   import { logger } from "@lifeos/shared";
 *   logger.info({ chat_id: 123 }, "Message received");
 *   const child = logger.child({ service: "bot" });
 */

import pino from "pino";

const LOG_LEVEL = process.env["LOG_LEVEL"] ?? "info";

export const logger: pino.Logger = pino({
  level: LOG_LEVEL,
  // Always emit structured JSON — Railway and most log platforms expect it.
  // Developers can pipe the output through `pino-pretty` if needed.
  formatters: {
    level(label) {
      // Use the human-readable level name instead of a numeric value in JSON.
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive fields that may accidentally appear in log objects.
  redact: {
    paths: [
      "*.password",
      "*.token",
      "*.api_key",
      "*.apiKey",
      "*.secret",
      "*.authorization",
      "*.DATABASE_URL",
    ],
    censor: "[REDACTED]",
  },
});
