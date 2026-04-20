/**
 * agent.ts — Conversation context persistence and agent core for the orchestrator.
 *
 * T-09: Provides two functions for maintaining a rolling 20-message window of
 * conversation history in the `conversation_context` PostgreSQL table:
 *
 *   loadContext(chatId)              — fetch the last 20 messages (oldest first)
 *   saveMessage(chatId, role, content) — insert a row and prune beyond 20
 *
 * T-10: Provides the agent loop:
 *
 *   runAgent(msg)                    — assemble system prompt, load context,
 *                                       call Anthropic API, execute tool loop,
 *                                       return final text response.
 *
 * All SQL uses parameterised queries ($1, $2, …) — no string interpolation.
 *
 * Database connection is obtained from the shared `pool` singleton which
 * reads DATABASE_URL from process.env via the shared env module.
 *
 * The Anthropic API key is read from process.env.ANTHROPIC_API_KEY via the
 * shared env module. The model is sourced from env.ANTHROPIC_MODEL which
 * defaults to "claude-sonnet-4-20250514".
 */

import Anthropic from "@anthropic-ai/sdk";
import { pool, env, logger } from "@lifeos/shared";
import type { MessageRole, ConversationMessage, IncomingMessage } from "@lifeos/shared";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of messages retained per chat_id. */
const CONTEXT_WINDOW = 20;

/** Maximum number of tool-loop iterations to prevent infinite loops. */
const MAX_TOOL_ITERATIONS = 10;

// ---------------------------------------------------------------------------
// Anthropic client (lazy singleton)
// ---------------------------------------------------------------------------

let _anthropicClient: Anthropic | null = null;

/**
 * Returns the shared Anthropic SDK client instance, creating it on first call.
 * The API key is sourced from env.ANTHROPIC_API_KEY (validated at startup).
 */
function getAnthropicClient(): Anthropic {
  if (_anthropicClient === null) {
    _anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _anthropicClient;
}

// ---------------------------------------------------------------------------
// System prompt assembly
// ---------------------------------------------------------------------------

/**
 * Assemble the system prompt with exactly five blocks in order:
 *   1. Identity
 *   2. Live context (current datetime + TZ)
 *   3. People index (empty in Phase 1)
 *   4. Pending nudges (empty in Phase 1)
 *   5. Active automations (empty in Phase 1)
 */
function buildSystemPrompt(): string {
  const now = new Date();
  const tz = env.TZ;

  // Format a human-readable local datetime string using the configured TZ.
  const localDatetime = now.toLocaleString("en-GB", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const isoDatetime = now.toISOString();

  return [
    // Block 1: Identity
    `## Identity
You are a personal life operating system assistant. You help the user manage their calendar, tasks, and daily schedule. You are concise, helpful, and proactive. You respond in the same language the user writes in.`,

    // Block 2: Live context
    `## Live Context
Current datetime: ${localDatetime}
ISO 8601: ${isoDatetime}
Timezone: ${tz}`,

    // Block 3: People index (empty in Phase 1)
    `## People Index
(No people records in Phase 1.)`,

    // Block 4: Pending nudges (empty in Phase 1)
    `## Pending Nudges
(No pending nudges in Phase 1.)`,

    // Block 5: Active automations (empty in Phase 1)
    `## Active Automations
(No active automations in Phase 1.)`,
  ].join("\n\n");
}

// ---------------------------------------------------------------------------
// Tool definitions (Phase 1: no tools wired yet — stubbed for tool loop)
// ---------------------------------------------------------------------------

/**
 * Tool definitions to include in the Anthropic API call.
 * In Phase 1 this array is empty; calendar tools are added in T-12/T-15.
 * The tool loop handles any tools that may be registered in later tasks.
 */
const TOOL_DEFINITIONS: Anthropic.Tool[] = [];

// ---------------------------------------------------------------------------
// Tool executor
// ---------------------------------------------------------------------------

/**
 * Execute a single tool call and return its result as a string.
 * Unrecognised tools return an error string so the model can handle it
 * gracefully rather than crashing the loop.
 *
 * @param toolName   The name of the tool to execute.
 * @param toolInput  The input parameters for the tool.
 * @returns          A string representation of the tool result.
 */
async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
): Promise<string> {
  // Tool registry will be populated in T-12/T-15 when calendar tools are added.
  // For now, return a graceful error for any unknown tool.
  logger.child({ service: "agent" }).warn(
    { toolName, toolInput },
    "Unknown tool called — no handler registered",
  );
  return JSON.stringify({ error: `Unknown tool: ${toolName}` });
}

// ---------------------------------------------------------------------------
// Agent loop
// ---------------------------------------------------------------------------

/**
 * Run the agent for an incoming message.
 *
 * Steps:
 *   1. Load conversation context for the chat.
 *   2. Assemble system prompt with five blocks.
 *   3. Append the new user message to the messages array.
 *   4. Call the Anthropic API with tool definitions.
 *   5. Tool loop: while the response contains tool_use blocks, execute each
 *      tool, append tool_result to messages, and call the API again.
 *   6. Persist both the user message and the final assistant response.
 *   7. Return the final text response.
 *
 * @param msg  The incoming message from the bot.
 * @returns    The assistant's text response.
 */
export async function runAgent(msg: IncomingMessage): Promise<string> {
  const log = logger.child({ service: "agent", chat_id: msg.chat_id });

  // Step 1: Load conversation context.
  const history = await loadContext(msg.chat_id);

  // Step 2: Assemble system prompt.
  const systemPrompt = buildSystemPrompt();

  // Step 3: Build messages array — history + new user message.
  const messages: Anthropic.MessageParam[] = [
    // Convert stored history to Anthropic message format.
    ...history.map(
      (m): Anthropic.MessageParam => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }),
    ),
    // Append the new user message.
    { role: "user", content: msg.text },
  ];

  const client = getAnthropicClient();

  let iterationCount = 0;
  let response: Anthropic.Message;

  // Step 4: Initial API call.
  // Model ID sourced from env.ANTHROPIC_MODEL (defaults to "claude-sonnet-4-20250514").
  const modelId = env.ANTHROPIC_MODEL;
  log.info({ model: modelId, messageCount: messages.length }, "Calling Anthropic API");

  response = await client.messages.create({
    model: modelId,
    max_tokens: 4096,
    system: systemPrompt,
    tools: TOOL_DEFINITIONS,
    messages,
  });

  // Step 5: Tool loop — execute tools until no more tool_use blocks remain.
  while (response.stop_reason === "tool_use" && iterationCount < MAX_TOOL_ITERATIONS) {
    iterationCount++;
    log.info({ iteration: iterationCount }, "Tool loop iteration");

    // Collect all tool_use blocks from this response.
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (toolUseBlocks.length === 0) {
      // stop_reason was tool_use but no tool blocks — defensive exit.
      break;
    }

    // Append the assistant's response (including tool_use blocks) to messages.
    messages.push({ role: "assistant", content: response.content });

    // Execute each tool and collect results.
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        log.info({ toolName: toolUse.name, toolId: toolUse.id }, "Executing tool");

        let resultContent: string;
        try {
          resultContent = await executeTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
          );
        } catch (err) {
          log.error({ err, toolName: toolUse.name }, "Tool execution error");
          resultContent = JSON.stringify({ error: String(err) });
        }

        return {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: resultContent,
        };
      }),
    );

    // Append the tool results as a user message.
    messages.push({ role: "user", content: toolResults });

    // Call the API again with the updated messages.
    response = await client.messages.create({
      model: modelId,
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOL_DEFINITIONS,
      messages,
    });
  }

  if (iterationCount >= MAX_TOOL_ITERATIONS) {
    log.warn({ iterationCount }, "Tool loop reached maximum iterations — breaking");
  }

  // Step 6: Extract the final text response.
  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );

  const replyText = textBlock?.text ?? "I was unable to generate a response. Please try again.";

  // Step 7: Persist the user message and assistant reply.
  await saveMessage(msg.chat_id, "user", msg.text);
  await saveMessage(msg.chat_id, "assistant", replyText);

  log.info({ replyLength: replyText.length }, "Agent response ready");

  return replyText;
}

// ---------------------------------------------------------------------------
// loadContext
// ---------------------------------------------------------------------------

/**
 * Fetch the most-recent `CONTEXT_WINDOW` messages for `chatId` and return
 * them in chronological order (oldest first), ready to be passed as the
 * `messages` array to the Anthropic API.
 *
 * Query strategy:
 *   1. Use a sub-query ordered by `created_at DESC` with `LIMIT 20` to
 *      efficiently select only the relevant rows via the composite index on
 *      `(chat_id, created_at DESC)`.
 *   2. Wrap it in an outer `ORDER BY created_at ASC` to flip to oldest-first.
 *
 * @param chatId  Telegram chat ID (number).
 * @returns       Array of ConversationMessage, oldest message at index 0.
 */
export async function loadContext(chatId: number): Promise<ConversationMessage[]> {
  const result = await pool.query<ConversationMessage>(
    `SELECT id, chat_id, role, content, created_at
       FROM (
         SELECT id, chat_id, role, content, created_at
           FROM conversation_context
          WHERE chat_id = $1
          ORDER BY created_at DESC, id DESC
          LIMIT $2
       ) AS recent
      ORDER BY created_at ASC, id ASC`,
    [chatId, CONTEXT_WINDOW],
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// saveMessage
// ---------------------------------------------------------------------------

/**
 * Insert a new message row for `chatId` and enforce the rolling 20-message
 * window by deleting any rows beyond the newest `CONTEXT_WINDOW` for that
 * chat_id.
 *
 * Both operations execute inside a single serializable transaction to
 * prevent races between concurrent inserts for the same chat_id.
 *
 * Pruning query:
 *   DELETE rows whose `id` is NOT in the set of the newest CONTEXT_WINDOW ids
 *   for this chat_id. Using a sub-query with `ORDER BY created_at DESC LIMIT`
 *   leverages the composite index and avoids a full table scan.
 *
 * @param chatId   Telegram chat ID (number).
 * @param role     "user" or "assistant".
 * @param content  Plain-text message body.
 */
export async function saveMessage(
  chatId: number,
  role: MessageRole,
  content: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert the new message row.
    await client.query(
      `INSERT INTO conversation_context (chat_id, role, content)
       VALUES ($1, $2, $3)`,
      [chatId, role, content],
    );

    // Delete any rows beyond the newest CONTEXT_WINDOW for this chat_id.
    // Order by (created_at DESC, id DESC) so that ties in sub-millisecond
    // timestamps are broken by the auto-increment id (newest row wins).
    // The sub-query selects the IDs of the rows we want to KEEP (newest 20),
    // then the outer DELETE removes every other row for the same chat_id.
    await client.query(
      `DELETE FROM conversation_context
        WHERE chat_id = $1
          AND id NOT IN (
            SELECT id
              FROM conversation_context
             WHERE chat_id = $1
             ORDER BY created_at DESC, id DESC
             LIMIT $2
          )`,
      [chatId, CONTEXT_WINDOW],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
