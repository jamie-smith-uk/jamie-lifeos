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
export declare const logger: pino.Logger;
//# sourceMappingURL=logger.d.ts.map