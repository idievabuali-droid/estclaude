/**
 * The fixed list of questions the intake bot collects from a
 * developer, in ask-order. `section` groups them in the summary.
 *
 * This mirrors what the platform's building card / building detail
 * page / apartment card actually need to render a complete listing.
 * Keep it lean — every question here is something the founder must
 * actually ask. Add a question only when a real platform field needs
 * it.
 */

export type QuestionType = 'text' | 'choice' | 'multichoice' | 'photo' | 'location';

export interface Question {
  id: string;
  /** Short label — shown on the menu button and in the summary. */
  label: string;
  type: QuestionType;
  /** Summary grouping. */
  section: string;
  /** Shown when the question is opened. */
  prompt: string;
  /** Optional example / hint appended under the prompt. */
  example?: string;
  /** Options for `choice` / `multichoice`. */
  choices?: string[];
}

/** The five Vahdat districts (matches the platform's `districts` table). */
export const DISTRICTS = ['Центр', 'Гулистон', 'Шарора', 'Истиқлол', 'Сарбозор'];

/** Building stages (matches STAGE_INFO labels on the platform). */
export const STAGES = ['Котлован', 'Строится', 'Почти готов', 'Сдан'];

/** Amenity options the platform's building page renders. */
export const AMENITIES = [
  'Парковка',
  'Охрана',
  'Лифт',
  'Детская площадка',
  'Фитнес',
  'Коммерческий этаж',
];

export const QUESTIONS: Question[] = [
  // ─── Застройщик ───────────────────────────────────────────
  {
    id: 'dev_company',
    label: 'Застройщик (компания)',
    type: 'text',
    section: 'Застройщик',
    prompt: 'Название компании-застройщика?',
    example: 'Например: ООО «Гулистон Строй»',
  },
  {
    id: 'dev_phone',
    label: 'Телефон застройщика',
    type: 'text',
    section: 'Застройщик',
    prompt: 'Контактный телефон отдела продаж?',
    example: 'Например: +992 90 123 45 67',
  },
  {
    id: 'dev_whatsapp',
    label: 'WhatsApp застройщика',
    type: 'text',
    section: 'Застройщик',
    prompt: 'Номер WhatsApp для связи с покупателями?',
    example: 'Если совпадает с телефоном — напишите «тот же».',
  },
  {
    id: 'dev_years',
    label: 'Лет на рынке',
    type: 'text',
    section: 'Застройщик',
    prompt: 'Сколько лет застройщик на рынке?',
    example: 'Например: 8. Если не знаете — напишите «—».',
  },
  {
    id: 'dev_portfolio',
    label: 'Портфолио застройщика',
    type: 'text',
    section: 'Застройщик',
    prompt:
      'Сколько проектов сдали и сколько сейчас в работе? Для тех, что в работе — на каких стадиях.',
    example:
      'Например: «Сдано 3 ЖК. В работе 4: 1 котлован, 2 строится, 1 почти готов».',
  },

  // ─── ЖК ───────────────────────────────────────────────────
  {
    id: 'zhk_name',
    label: 'Название ЖК',
    type: 'text',
    section: 'ЖК',
    prompt: 'Название жилого комплекса?',
    example: 'Например: ЖК «Гулистон Резиденс»',
  },
  {
    id: 'zhk_district',
    label: 'Район Вахдата',
    type: 'choice',
    section: 'ЖК',
    prompt: 'В каком районе Вахдата находится ЖК?',
    choices: DISTRICTS,
  },
  {
    id: 'zhk_address',
    label: 'Адрес',
    type: 'text',
    section: 'ЖК',
    prompt: 'Адрес ЖК?',
    example: 'Например: ул. Айни, 14',
  },
  {
    id: 'zhk_map',
    label: 'Точка на карте',
    type: 'location',
    section: 'ЖК',
    prompt: 'Отправьте точку на карте (скрепка → Геопозиция) или ссылку Google Maps.',
    example: 'Можно также описать ориентир текстом.',
  },
  {
    id: 'zhk_stage',
    label: 'Стадия строительства',
    type: 'choice',
    section: 'ЖК',
    prompt: 'На какой стадии строительство?',
    choices: STAGES,
  },
  {
    id: 'zhk_handover',
    label: 'Срок сдачи',
    type: 'text',
    section: 'ЖК',
    prompt: 'Когда сдают ЖК? Квартал и год.',
    example: 'Например: 2026-Q4 или «4 квартал 2026».',
  },
  {
    id: 'zhk_floors',
    label: 'Этажей в доме',
    type: 'text',
    section: 'ЖК',
    prompt: 'Сколько этажей в доме?',
    example: 'Например: 9',
  },
  {
    id: 'zhk_units',
    label: 'Всего квартир',
    type: 'text',
    section: 'ЖК',
    prompt: 'Сколько всего квартир в ЖК?',
    example: 'Например: 120',
  },
  {
    id: 'zhk_description',
    label: 'Описание ЖК',
    type: 'text',
    section: 'ЖК',
    prompt: 'Короткое описание проекта.',
    example: 'Например: кирпичный дом, закрытый двор, своя парковка.',
  },
  {
    id: 'zhk_amenities',
    label: 'Удобства',
    type: 'multichoice',
    section: 'ЖК',
    prompt: 'Что есть в ЖК? Отметьте всё подходящее.',
    choices: AMENITIES,
  },

  // ─── Рассрочка ────────────────────────────────────────────
  {
    id: 'installment',
    label: 'Условия рассрочки',
    type: 'text',
    section: 'Рассрочка',
    prompt: 'Условия рассрочки: первый взнос, платёж в месяц, срок.',
    example:
      'Например: первый взнос 30%, 2 500 TJS/мес, 36 мес. Без рассрочки — напишите «нет».',
  },

  // ─── Квартиры ─────────────────────────────────────────────
  {
    id: 'apartments',
    label: 'Прайс-лист квартир',
    type: 'photo',
    section: 'Квартиры',
    prompt: 'Пришлите прайс-лист квартир — фото листа или текстом.',
    example: 'По каждой квартире: комнат, м², этаж, цена, отделка.',
  },
  {
    id: 'floorplans',
    label: 'Планировки',
    type: 'photo',
    section: 'Квартиры',
    prompt:
      'Пришлите фото планировок квартир. Для каждой напишите, на каких этажах она встречается.',
    example:
      'Например: «1-комн. 38 м² — этажи 2, 4, 6». Можно несколько фото и подписей подряд.',
  },

  // ─── Фото ─────────────────────────────────────────────────
  {
    id: 'photos_zhk',
    label: 'Фото ЖК / рендеры',
    type: 'photo',
    section: 'Фото',
    prompt: 'Пришлите фото или рендеры ЖК.',
    example: 'Можно несколько фото подряд.',
  },
  {
    id: 'photos_progress',
    label: 'Фото хода стройки',
    type: 'photo',
    section: 'Фото',
    prompt: 'Пришлите фото хода строительства.',
    example: 'Если можно — укажите месяц съёмки текстом.',
  },
];

export function questionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id);
}
