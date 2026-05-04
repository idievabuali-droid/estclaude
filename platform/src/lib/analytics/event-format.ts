import { displayNameFromFilters } from '@/lib/saved-searches/format';

/**
 * Render a single events row as a one-line human-readable Russian
 * sentence the operator can scan without parsing JSON. Designed for
 * the per-visitor event feed.
 *
 * Falls back to the raw event_type when we don't have a friendly
 * formatter for it — better to show *something* than nothing, and
 * the raw JSON is still available via the row's collapsible
 * disclosure.
 */
export function formatEventRow(event: {
  event_type: string;
  properties: Record<string, unknown> | null;
  url: string | null;
}): string {
  const props = (event.properties ?? {}) as Record<string, unknown>;

  switch (event.event_type) {
    case 'page_view': {
      const path = (props.pathname as string | undefined) ?? '/';
      const m = path.match(/\/(kvartira|zhk)\/([^/?#]+)/);
      if (m) {
        const kind = m[1] === 'kvartira' ? 'квартиру' : 'ЖК';
        return `Открыли ${kind}: ${m[2]}`;
      }
      const search = (props.search as string | undefined) ?? '';
      if (path === '/novostroyki' || path === '/kvartiry') {
        const friendly = readableFiltersFromQs(path === '/novostroyki' ? 'novostroyki' : 'kvartiry', search);
        return friendly ? `Открыли ${pageLabel(path)}: ${friendly}` : `Открыли ${pageLabel(path)}`;
      }
      return `Открыли страницу ${path}`;
    }

    case 'search_run': {
      const page = (props.page as 'novostroyki' | 'kvartiry' | undefined) ?? 'novostroyki';
      const filters = (props.filters as Record<string, string | string[] | undefined> | undefined) ?? {};
      const count = props.result_count;
      const label = displayNameFromFilters(page, filters);
      return `Поиск: ${label} → ${typeof count === 'number' ? count : '?'} результат${pluralResult(typeof count === 'number' ? count : 0)}`;
    }

    case 'search_no_results': {
      const page = (props.page as 'novostroyki' | 'kvartiry' | undefined) ?? 'novostroyki';
      const filters = (props.filters as Record<string, string | string[] | undefined> | undefined) ?? {};
      return `Поиск без результатов: ${displayNameFromFilters(page, filters)}`;
    }

    case 'listing_card_click': {
      const slug = (props.listing_slug as string | undefined) ?? '?';
      const source = (props.source as string | undefined) ?? '';
      return `Кликнули карточку квартиры (${slug})${source ? ` из ${source}` : ''}`;
    }

    case 'building_card_click': {
      const slug = (props.building_slug as string | undefined) ?? '?';
      return `Кликнули карточку ЖК (${slug})`;
    }

    case 'contact_button_click': {
      const channel = channelLabel((props.channel as string | undefined) ?? 'unknown');
      const source = (props.source as string | undefined);
      return `Контакт: нажали ${channel}${source ? ` (${source})` : ''}`;
    }

    case 'save_attempt_logged_out': {
      const type = (props.type as string | undefined) ?? '';
      const target = (props.target_id as string | undefined) ?? '';
      const noun = type === 'building' ? 'ЖК' : type === 'listing' ? 'квартиру' : type;
      return `Пытались сохранить ${noun} (${target.slice(0, 8)}…) без входа`;
    }

    case 'saved_search_subscribed': {
      const via = (props.via as string | undefined) ?? '';
      return `Подписались на сохранённый поиск${via ? ` (${via})` : ''}`;
    }

    case 'callback_request_submitted': {
      const phone = props.phone_provided ? 'оставили номер' : 'отправили';
      return `Запрос обратной связи: ${phone}`;
    }

    case 'callback_widget_typed_no_submit': {
      return 'Начали оставлять номер в форме обратной связи, но не отправили';
    }

    case 'listing_revisit': {
      const slug = (props.listing_slug as string | undefined) ?? '?';
      const count = (props.view_count as number | undefined) ?? 3;
      return `Снова открыли квартиру ${slug} (${count}-й раз за сутки)`;
    }

    default:
      return event.event_type;
  }
}

function pageLabel(path: string): string {
  if (path === '/novostroyki') return 'каталог ЖК';
  if (path === '/kvartiry') return 'каталог квартир';
  return path;
}

function channelLabel(channel: string): string {
  if (channel === 'whatsapp') return 'WhatsApp';
  if (channel === 'telegram') return 'Telegram';
  if (channel === 'phone') return 'Звонок';
  return channel;
}

function pluralResult(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return 'ов';
  if (last > 1 && last < 5) return 'а';
  if (last === 1) return '';
  return 'ов';
}

/** Convert a `?status=delivered&handover=2027` style query string into
 *  a human label using displayNameFromFilters. Returns null for empty
 *  search params (so the caller can fall back to a different copy). */
function readableFiltersFromQs(page: 'novostroyki' | 'kvartiry', search: string): string | null {
  if (!search) return null;
  const sp = new URLSearchParams(search);
  const filters: Record<string, string> = {};
  for (const [k, v] of sp.entries()) {
    if (k === 'view' || k === 'focus' || k === 'from' || k === 'fromSlug') continue;
    if (v) filters[k] = v;
  }
  if (Object.keys(filters).length === 0) return null;
  return displayNameFromFilters(page, filters);
}
