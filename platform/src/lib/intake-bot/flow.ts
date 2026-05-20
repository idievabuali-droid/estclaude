/**
 * Conversation flow for the intake bot.
 *
 * Stateless across webhook invocations — every piece of state lives
 * in the intake_bot_sessions row. The UX model:
 *
 *   - There is one menu message: a list of questions, each with a
 *     ✅ once answered. Re-tapping an answered question re-asks it.
 *   - Tapping a question replaces the menu with a prompt at the
 *     bottom of the chat (near the keyboard on mobile).
 *   - Answering replaces the prompt with a fresh menu at the bottom.
 *   - "Показать всё" prints a copy-ready summary of every answer.
 *   - "Начать заново" clears every answer for the next developer.
 */
import {
  sendMessage,
  editMessage,
  deleteMessage,
  answerCallback,
} from './telegram';
import { QUESTIONS, questionById, type Question } from './questions';
import {
  getSession,
  saveSession,
  isPhotoAnswer,
  type IntakeSession,
  type AnswerValue,
  type PhotoAnswer,
} from './store';
import type {
  TgUpdate,
  TgMessage,
  TgCallbackQuery,
  TgInlineKeyboard,
} from './types';

type Answers = Record<string, AnswerValue>;

const BACK_ROW = [{ text: '← Назад в меню', callback_data: 'back' }];

// ─── entry point ────────────────────────────────────────────
export async function handleUpdate(update: TgUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallback(update.callback_query);
  } else if (update.message) {
    await handleMessage(update.message);
  }
}

// ─── answered-state helpers ─────────────────────────────────
function isAnswered(q: Question, answers: Answers): boolean {
  const v = answers[q.id];
  if (v == null) return false;
  if (isPhotoAnswer(v)) {
    return v.photoCount > 0 || (v.text?.trim().length ?? 0) > 0;
  }
  if (Array.isArray(v)) return v.length > 0;
  return v.trim().length > 0;
}

// ─── menu rendering ─────────────────────────────────────────
function renderMenu(
  session: IntakeSession,
  banner?: string,
): { text: string; keyboard: TgInlineKeyboard } {
  const answeredCount = QUESTIONS.filter((q) =>
    isAnswered(q, session.answers),
  ).length;

  const lines: string[] = [];
  if (banner) lines.push(banner, '');
  lines.push('📋 Сбор данных по застройщику');
  lines.push('');
  lines.push(`Отвечено: ${answeredCount} из ${QUESTIONS.length}`);
  lines.push('');
  lines.push(
    'Нажмите вопрос, чтобы ответить. ✅ — уже отвечено. ' +
      'Любой вопрос можно изменить — нажмите его снова.',
  );

  const keyboard: TgInlineKeyboard = QUESTIONS.map((q) => [
    {
      text: `${isAnswered(q, session.answers) ? '✅' : '◻️'} ${q.label}`,
      callback_data: `q:${q.id}`,
    },
  ]);
  keyboard.push([
    { text: '📋 Показать всё собранное', callback_data: 'done' },
  ]);
  keyboard.push([{ text: '🔄 Начать заново', callback_data: 'reset' }]);

  return { text: lines.join('\n'), keyboard };
}

async function safeDelete(
  chatId: number,
  messageId: number | null,
): Promise<void> {
  if (messageId == null) return;
  try {
    await deleteMessage(chatId, messageId);
  } catch {
    // Message already gone or too old to delete — non-fatal.
  }
}

/**
 * Drop any open prompt + menu and send a fresh menu at the bottom of
 * the chat. This is the bot's idle state — `awaiting` is always
 * cleared here.
 */
async function showMenu(
  session: IntakeSession,
  banner?: string,
): Promise<void> {
  await safeDelete(session.chatId, session.promptMessageId);
  await safeDelete(session.chatId, session.menuMessageId);
  const { text, keyboard } = renderMenu(session, banner);
  const id = await sendMessage(session.chatId, text, keyboard);
  session.menuMessageId = id;
  session.promptMessageId = null;
  session.awaiting = null;
  await saveSession(session);
}

// ─── prompt rendering ───────────────────────────────────────
function currentAnswerLine(q: Question, answers: Answers): string | null {
  if (!isAnswered(q, answers)) return null;
  const v = answers[q.id];
  if (isPhotoAnswer(v)) {
    const parts: string[] = [];
    if (v.photoCount > 0) parts.push(`${v.photoCount} фото`);
    if (v.text?.trim()) parts.push(v.text.trim());
    return `Сейчас: ${parts.join(' · ')}`;
  }
  if (Array.isArray(v)) return `Сейчас: ${v.join(', ')}`;
  return `Сейчас: ${v ?? ''}`;
}

function promptText(q: Question, answers: Answers): string {
  const lines = [q.prompt];
  if (q.example) lines.push('', q.example);
  // Multi-choice shows its current state in the toggle keyboard, so
  // a "Сейчас:" line would just duplicate it.
  if (q.type !== 'multichoice') {
    const cur = currentAnswerLine(q, answers);
    if (cur) lines.push('', cur);
  }
  return lines.join('\n');
}

function choiceKeyboard(q: Question): TgInlineKeyboard {
  const rows: TgInlineKeyboard = (q.choices ?? []).map((c, i) => [
    { text: c, callback_data: `c:${q.id}:${i}` },
  ]);
  rows.push(BACK_ROW);
  return rows;
}

function multichoiceKeyboard(q: Question, answers: Answers): TgInlineKeyboard {
  const v = answers[q.id];
  const selected = Array.isArray(v) ? v : [];
  const rows: TgInlineKeyboard = (q.choices ?? []).map((c, i) => [
    {
      text: `${selected.includes(c) ? '✅' : '◻️'} ${c}`,
      callback_data: `m:${q.id}:${i}`,
    },
  ]);
  rows.push([{ text: '✅ Готово', callback_data: `md:${q.id}` }]);
  rows.push(BACK_ROW);
  return rows;
}

function photoKeyboard(): TgInlineKeyboard {
  return [[{ text: '✅ Готово', callback_data: 'back' }]];
}

/** Replace the menu with a prompt for question `q`. */
async function openQuestion(
  session: IntakeSession,
  q: Question,
): Promise<void> {
  await safeDelete(session.chatId, session.promptMessageId);
  await safeDelete(session.chatId, session.menuMessageId);
  session.menuMessageId = null;

  let keyboard: TgInlineKeyboard;
  if (q.type === 'choice') {
    keyboard = choiceKeyboard(q);
    session.awaiting = null;
  } else if (q.type === 'multichoice') {
    keyboard = multichoiceKeyboard(q, session.answers);
    session.awaiting = null;
  } else if (q.type === 'photo') {
    keyboard = photoKeyboard();
    session.awaiting = q.id;
  } else {
    // text / location — the answer arrives as a normal message.
    keyboard = [BACK_ROW];
    session.awaiting = q.id;
  }

  const id = await sendMessage(
    session.chatId,
    promptText(q, session.answers),
    keyboard,
  );
  session.promptMessageId = id;
  await saveSession(session);
}

// ─── summary ────────────────────────────────────────────────
function formatValue(q: Question, answers: Answers): string {
  if (!isAnswered(q, answers)) return '—';
  const v = answers[q.id];
  if (isPhotoAnswer(v)) {
    const parts: string[] = [];
    if (v.photoCount > 0) parts.push(`${v.photoCount} фото (в этом чате)`);
    if (v.text?.trim()) parts.push(v.text.trim());
    return parts.join(' · ');
  }
  if (Array.isArray(v)) return v.join(', ');
  return v ?? '—';
}

function buildSummary(answers: Answers): string {
  const lines: string[] = ['СОБРАННЫЕ ДАННЫЕ ПО ЗАСТРОЙЩИКУ', ''];
  const sections: string[] = [];
  for (const q of QUESTIONS) {
    if (!sections.includes(q.section)) sections.push(q.section);
  }
  for (const section of sections) {
    lines.push(`— ${section} —`);
    for (const q of QUESTIONS) {
      if (q.section !== section) continue;
      lines.push(`${q.label}: ${formatValue(q, answers)}`);
    }
    lines.push('');
  }
  lines.push(
    'Пустые поля отмечены как «—». ' +
      'Фото остаются в этом чате — их можно переслать.',
  );
  return lines.join('\n');
}

// ─── message handler ────────────────────────────────────────
async function handleMessage(msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  const session = await getSession(chatId);

  // Commands always take priority over any open question.
  if (text && text.startsWith('/')) {
    if (text === '/start') {
      await showMenu(session, 'Бот для сбора данных по застройщикам.');
    } else {
      // /menu and anything else — just (re)show the menu.
      await showMenu(session);
    }
    return;
  }

  if (!session.awaiting) {
    await showMenu(session, 'Чтобы ответить, нажмите вопрос в меню ниже.');
    return;
  }

  const q = questionById(session.awaiting);
  if (!q) {
    await showMenu(session);
    return;
  }

  // Photo question — collect photos and/or text; stay open until the
  // founder taps ✅ Готово (handled as the 'back' callback). Keeping
  // `awaiting` set means every photo of a multi-photo album counts.
  if (q.type === 'photo') {
    const existing = session.answers[q.id];
    const acc: PhotoAnswer = isPhotoAnswer(existing)
      ? { photoCount: existing.photoCount, text: existing.text }
      : { photoCount: 0 };

    if (msg.photo && msg.photo.length > 0) {
      acc.photoCount += 1;
    }
    const caption = msg.text?.trim() ?? msg.caption?.trim();
    if (caption) {
      acc.text = acc.text ? `${acc.text}\n${caption}` : caption;
    }
    session.answers[q.id] = acc;
    await saveSession(session);

    // Best-effort live feedback on the prompt.
    if (session.promptMessageId != null) {
      const info =
        `${q.prompt}\n\nДобавлено: ${acc.photoCount} фото` +
        `${acc.text ? ' + текст' : ''}.\n` +
        'Пришлите ещё или нажмите ✅ Готово.';
      try {
        await editMessage(
          chatId,
          session.promptMessageId,
          info,
          photoKeyboard(),
        );
      } catch {
        // Edit rejected (rate limit / identical) — data is saved anyway.
      }
    }
    return;
  }

  // text / location question.
  let value: string | null = null;
  if (q.type === 'location' && msg.location) {
    value = `${msg.location.latitude}, ${msg.location.longitude}`;
  } else if (text) {
    value = text;
  }

  if (!value) {
    await sendMessage(
      chatId,
      q.type === 'location'
        ? 'Отправьте геопозицию (скрепка → Геопозиция) или напишите ссылку / ориентир текстом.'
        : 'Напишите ответ текстом.',
    );
    return;
  }

  session.answers[q.id] = value;
  session.awaiting = null;
  await showMenu(session, `✅ Сохранено: ${q.label}`);
}

// ─── callback handler ───────────────────────────────────────
async function handleCallback(cb: TgCallbackQuery): Promise<void> {
  // Stop the button spinner first, whatever happens next.
  try {
    await answerCallback(cb.id);
  } catch {
    // Callback too old to answer — non-fatal.
  }

  const chatId = cb.message?.chat.id;
  const data = cb.data;
  if (chatId == null || !data) return;

  const session = await getSession(chatId);

  if (data === 'noop') return;

  if (data === 'back') {
    await showMenu(session);
    return;
  }

  if (data === 'done') {
    await sendMessage(chatId, buildSummary(session.answers));
    await showMenu(session);
    return;
  }

  if (data === 'reset') {
    await safeDelete(chatId, session.promptMessageId);
    await safeDelete(chatId, session.menuMessageId);
    session.menuMessageId = null;
    session.awaiting = null;
    const id = await sendMessage(
      chatId,
      'Начать заново? Все ответы по текущему застройщику будут стёрты.',
      [
        [{ text: '✅ Да, стереть всё', callback_data: 'reset_yes' }],
        BACK_ROW,
      ],
    );
    session.promptMessageId = id;
    await saveSession(session);
    return;
  }

  if (data === 'reset_yes') {
    session.answers = {};
    await showMenu(
      session,
      '🔄 Все ответы стёрты. Можно собирать данные по новому застройщику.',
    );
    return;
  }

  if (data.startsWith('q:')) {
    const q = questionById(data.slice(2));
    if (q) await openQuestion(session, q);
    return;
  }

  // Single choice: c:<questionId>:<choiceIndex>
  if (data.startsWith('c:')) {
    const parts = data.split(':');
    const qid = parts[1];
    const idx = Number(parts[2]);
    if (!qid || !Number.isInteger(idx)) return;
    const q = questionById(qid);
    const choice = q?.choices?.[idx];
    if (q && choice !== undefined) {
      session.answers[q.id] = choice;
      await showMenu(session, `✅ Сохранено: ${q.label}`);
    }
    return;
  }

  // Multi-choice toggle: m:<questionId>:<choiceIndex>
  if (data.startsWith('m:')) {
    const parts = data.split(':');
    const qid = parts[1];
    const idx = Number(parts[2]);
    if (!qid || !Number.isInteger(idx)) return;
    const q = questionById(qid);
    const choice = q?.choices?.[idx];
    if (!q || choice === undefined) return;

    const cur = session.answers[q.id];
    const selected = Array.isArray(cur) ? [...cur] : [];
    const at = selected.indexOf(choice);
    if (at >= 0) selected.splice(at, 1);
    else selected.push(choice);
    session.answers[q.id] = selected;
    await saveSession(session);

    if (session.promptMessageId != null) {
      try {
        await editMessage(
          chatId,
          session.promptMessageId,
          promptText(q, session.answers),
          multichoiceKeyboard(q, session.answers),
        );
      } catch {
        // Identical-content edit — harmless.
      }
    }
    return;
  }

  // Multi-choice done: md:<questionId>
  if (data.startsWith('md:')) {
    const q = questionById(data.slice(3));
    if (q) await showMenu(session, `✅ Сохранено: ${q.label}`);
    return;
  }
}
