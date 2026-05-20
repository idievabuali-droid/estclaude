/**
 * Read / write the intake bot's per-chat session row. Backed by the
 * intake_bot_sessions table via the service-role admin client.
 *
 * The webhook is stateless across invocations (serverless cold
 * starts), so every piece of conversation state lives in this row.
 */
import { createAdminClient } from '@/lib/supabase/admin';

/** A photo-type answer: how many photos arrived, plus any typed text
 *  (used by the "прайс-лист — фото или текст" question). */
export interface PhotoAnswer {
  photoCount: number;
  text?: string;
}

/** A stored answer — plain text / single choice (string), multi-choice
 *  (string[]), or a photo collection (PhotoAnswer). */
export type AnswerValue = string | string[] | PhotoAnswer;

export interface IntakeSession {
  chatId: number;
  answers: Record<string, AnswerValue>;
  /** Question id awaiting a typed / photo answer, or null when idle. */
  awaiting: string | null;
  /** The menu message currently shown (so it can be replaced). */
  menuMessageId: number | null;
  /** The open question prompt message (so it can be edited / removed). */
  promptMessageId: number | null;
}

/** Type guard — distinguishes a PhotoAnswer from string / string[]. */
export function isPhotoAnswer(v: AnswerValue | undefined): v is PhotoAnswer {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const TABLE = 'intake_bot_sessions';

interface SessionRow {
  chat_id: number;
  answers: Record<string, AnswerValue> | null;
  awaiting: string | null;
  menu_message_id: number | null;
  prompt_message_id: number | null;
}

/** Load the session for a chat. Returns an empty session if none yet. */
export async function getSession(chatId: number): Promise<IntakeSession> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from(TABLE)
    .select('chat_id, answers, awaiting, menu_message_id, prompt_message_id')
    .eq('chat_id', chatId)
    .maybeSingle();

  const row = data as SessionRow | null;
  return {
    chatId,
    answers: row?.answers ?? {},
    awaiting: row?.awaiting ?? null,
    menuMessageId: row?.menu_message_id ?? null,
    promptMessageId: row?.prompt_message_id ?? null,
  };
}

/** Persist the session (upsert on chat_id). */
export async function saveSession(session: IntakeSession): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from(TABLE).upsert(
    {
      chat_id: session.chatId,
      answers: session.answers,
      awaiting: session.awaiting,
      menu_message_id: session.menuMessageId,
      prompt_message_id: session.promptMessageId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chat_id' },
  );
  if (error) {
    throw new Error(`intake_bot_sessions upsert failed: ${error.message}`);
  }
}
