/**
 * db.ts — PostgreSQL connection pool singleton.
 *
 * Creates a single Pool instance using DATABASE_URL from env and re-uses it
 * for the lifetime of the process. All queries should import and use `pool`
 * directly rather than creating their own connections.
 *
 * The pool is configured conservatively:
 *   - max 10 connections (suitable for a single Railway instance)
 *   - idleTimeoutMillis 30 s (release idle connections promptly)
 *   - connectionTimeoutMillis 5 s (fail fast if the DB is unreachable)
 *
 * SSL is enabled when DATABASE_URL is not pointing at localhost, which covers
 * both Railway Postgres and any hosted provider that requires TLS.
 */
import { Pool } from "pg";
/**
 * Shared pg Pool instance. Import this wherever you need a database
 * connection instead of creating a new Pool.
 */
export declare const pool: Pool;
/**
 * Gracefully end the pool. Call this in process shutdown handlers to allow
 * in-flight queries to complete before the process exits.
 */
export declare function closePool(): Promise<void>;
//# sourceMappingURL=db.d.ts.map