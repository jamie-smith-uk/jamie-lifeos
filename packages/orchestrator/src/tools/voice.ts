/**
 * voice.ts — Voice transcription tools for Telegram voice messages
 *
 * Implements transcribe_voice_message function that downloads Telegram voice
 * files and sends them to OpenAI Whisper API for transcription.
 */

import { env, logger, pool } from "@lifeos/shared";

interface TranscribeVoiceMessageParams {
  file_id: string;
}

interface CreatePendingVoiceIntentParams {
  chat_id: number;
  transcription: string;
  telegram_file_id: string;
}

interface ConsumePendingVoiceIntentParams {
  id: number;
}

interface PendingVoiceIntent {
  id: number;
  chat_id: number;
  transcription: string;
  telegram_file_id: string;
  expires_at: Date;
  created_at: Date;
}

interface TelegramGetFileResponse {
  ok: boolean;
  result?: {
    file_path: string;
  };
  error_code?: number;
  description?: string;
}

interface OpenAITranscriptionResponse {
  text: string;
  error?: {
    message: string;
    type: string;
  };
}

interface WhisperRequestOptions {
  method: string;
  headers: {
    Authorization: string;
  };
  body: FormData;
}

/**
 * Gets file path from Telegram using file_id
 */
async function getTelegramFilePath(
  fileId: string,
  voiceLogger: typeof logger,
): Promise<string | null> {
  const getFileUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
  const getFileResponse = await fetch(getFileUrl, {
    method: "GET",
  });

  if (!getFileResponse.ok) {
    const error = `Telegram getFile failed: ${getFileResponse.status} ${getFileResponse.statusText}`;
    voiceLogger.error({ status: getFileResponse.status }, error);
    return null;
  }

  let getFileData: TelegramGetFileResponse;
  try {
    getFileData = (await getFileResponse.json()) as TelegramGetFileResponse;
  } catch (jsonError) {
    voiceLogger.error({ error: jsonError }, "Failed to parse Telegram getFile response");
    return null;
  }

  if (!getFileData.ok || !getFileData.result?.file_path) {
    const errorCode = getFileData.error_code ?? "unknown";
    const errorDesc = getFileData.description ?? "no description";
    const error = `Telegram getFile error: ${errorCode} ${errorDesc}`;
    voiceLogger.error({ telegram_error: getFileData }, error);
    return null;
  }

  return getFileData.result.file_path;
}

/**
 * Downloads audio file from Telegram
 */
async function downloadTelegramFile(
  filePath: string,
  voiceLogger: typeof logger,
): Promise<ArrayBuffer | null> {
  const fileDownloadUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;
  const fileResponse = await fetch(fileDownloadUrl);

  if (!fileResponse.ok) {
    const error = `File download failed: ${fileResponse.status} ${fileResponse.statusText}`;
    voiceLogger.error({ status: fileResponse.status }, error);
    return null;
  }

  const audioBuffer = await fileResponse.arrayBuffer();
  voiceLogger.info({ file_size: audioBuffer.byteLength }, "Voice file downloaded");
  return audioBuffer;
}

/**
 * Transcribes audio using OpenAI Whisper API
 */
async function transcribeWithWhisper(
  audioBuffer: ArrayBuffer,
  voiceLogger: typeof logger,
): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", new Blob([audioBuffer]), "voice.oga");
  formData.append("model", "whisper-1");

  const requestOptions: WhisperRequestOptions = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: formData,
  };

  const whisperResponse = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    requestOptions,
  );

  if (!whisperResponse.ok) {
    const error = `OpenAI Whisper API failed: ${whisperResponse.status} ${whisperResponse.statusText}`;
    voiceLogger.error({ status: whisperResponse.status }, error);
    return null;
  }

  let transcriptionData: OpenAITranscriptionResponse;
  try {
    transcriptionData = (await whisperResponse.json()) as OpenAITranscriptionResponse;
  } catch (jsonError) {
    voiceLogger.error({ error: jsonError }, "Failed to parse OpenAI Whisper response");
    return null;
  }

  if (transcriptionData.error) {
    const error = `OpenAI Whisper error: ${transcriptionData.error.message}`;
    voiceLogger.error({ openai_error: transcriptionData.error }, error);
    return null;
  }

  return transcriptionData.text || "";
}

/**
 * Downloads a Telegram voice file and transcribes it using OpenAI Whisper API
 */
export async function transcribe_voice_message(
  params: TranscribeVoiceMessageParams,
): Promise<string> {
  const voiceLogger = logger.child({ tool: "voice", file_id: params.file_id });

  try {
    voiceLogger.info("Starting voice transcription");

    const filePath = await getTelegramFilePath(params.file_id, voiceLogger);
    if (!filePath) {
      return "error: Failed to get file path from Telegram";
    }

    const audioBuffer = await downloadTelegramFile(filePath, voiceLogger);
    if (!audioBuffer) {
      return "error: Failed to download audio file";
    }

    const transcription = await transcribeWithWhisper(audioBuffer, voiceLogger);
    if (transcription === null) {
      return "error: Failed to transcribe with Whisper API";
    }

    voiceLogger.info(
      { transcription_length: transcription.length },
      "Voice transcription completed",
    );
    return transcription;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    voiceLogger.error({ error: errorMessage }, "Voice transcription failed");
    return `error: ${errorMessage}`;
  }
}

/**
 * Creates a pending voice intent in the database with a 5-minute TTL
 */
export async function create_pending_voice_intent(
  params: CreatePendingVoiceIntentParams,
): Promise<PendingVoiceIntent> {
  const sql = `
    INSERT INTO pending_voice_intents (chat_id, transcription, telegram_file_id, expires_at)
    VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')
    RETURNING id, chat_id, transcription, telegram_file_id, expires_at, created_at
  `;

  const result = await pool.query(sql, [
    params.chat_id,
    params.transcription,
    params.telegram_file_id,
  ]);

  return result.rows[0] as PendingVoiceIntent;
}

/**
 * Reads and deletes a pending voice intent by ID, returning null if expired
 */
export async function consume_pending_voice_intent(
  params: ConsumePendingVoiceIntentParams,
): Promise<PendingVoiceIntent | null> {
  const sql = `
    DELETE FROM pending_voice_intents
    WHERE id = $1
    RETURNING id, chat_id, transcription, telegram_file_id, expires_at, created_at
  `;

  const result = await pool.query(sql, [params.id]);

  if (result.rows.length === 0) {
    return null;
  }

  const intent = result.rows[0] as PendingVoiceIntent;

  // Check if the intent is expired (expires_at is in the past)
  if (intent.expires_at <= new Date()) {
    return null;
  }

  return intent;
}
