import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Derives a one-page "buyer profile" for a single anon_id from their
 * events + saved_items + saved_searches.
 *
 * The point: when the operator opens a per-visitor view they should
 * see "this person wants a 1-room in Гулистон up to 200k TJS" in
 * one short sentence — not have to read the whole event feed and
 * infer it themselves.
 *
 * Aggregations are simple frequency counts; for a 6-building inventory
 * we don't need fancy bucketing or ML. If volume grows we can move
 * the dominant-value calculations into Postgres.
 */

interface EventRow {
  id: string;
  event_type: string;
  properties: Record<string, unknown>;
  url: string | null;
  occurred_at: string;
  user_id: string | null;
}

interface SavedSearchRow {
  id: string;
  page: string;
  filters: Record<string, unknown>;
  display_name: string;
  notify_chat_id: number | null;
  notify_phone: string | null;
  active: boolean;
  created_at: string;
}

interface SavedItemRow {
  id: string;
  building_id: string | null;
  listing_id: string | null;
  saved_at: string;
}

interface ContactRequestRow {
  id: string;
  listing_id: string;
  channel: string;
  status: string;
  buyer_phone: string | null;
  created_at: string;
}

export interface BuyerProfile {
  /** Most-asked-for room count (e.g. "2"). null if no preference visible. */
  dominantRooms: string | null;
  /** {min, max} in TJS, derived from price filters in their searches. */
  priceBandTjs: { min: number | null; max: number | null } | null;
  /** Districts they've filtered by, ranked. */
  districts: string[];
  /** Finishing types they've filtered by, ranked. */
  finishings: string[];
  /** Building stages (announced/under_construction/...) they've filtered by. */
  stages: string[];
  /** Cards/pages they've engaged with, by listing slug. */
  topListingSlugs: string[];
  topBuildingSlugs: string[];
  /** Total page views. */
  pageViewCount: number;
  /** Whether they've ever searched. */
  searchCount: number;
  /** Searches that returned 0. */
  noResultCount: number;
  /** Whether they ever clicked a contact channel. */
  contactClickCount: number;
  /** Computed lead temperature — see WARM/HOT thresholds in deriveLeadTemp. */
  leadTemp: 'cold' | 'warm' | 'hot';
}

/**
 * Aggregated friction signals for a single visitor.
 * Each item comes with a short human label the dashboard can render
 * without further formatting.
 */
export interface FrictionSignal {
  /** Stable key per signal type — used for React keys. */
  key: string;
  /** Russian human description ready for the UI. */
  label: string;
  /** Optional ISO timestamp of when it last happened. */
  lastSeen?: string;
}

export interface VisitorBundle {
  events: EventRow[];
  savedSearches: SavedSearchRow[];
  savedItems: SavedItemRow[];
  contactRequests: ContactRequestRow[];
  identity: { phone: string; tg_username: string | null } | null;
  firstSeen: string | null;
  lastSeen: string | null;
}

/**
 * One round-trip per table — for a single visitor's whole bundle.
 * V1 volume per visitor is small enough that fetching everything is
 * fine; if a power user accumulates thousands of events we can add
 * a 200-row cap on the events query (the rest of the derivations
 * still work off totals + the recent slice).
 */
export async function getVisitorBundle(anonId: string): Promise<VisitorBundle> {
  const supabase = createAdminClient();

  const eventsRes = await supabase
    .from('events')
    .select('id, event_type, properties, url, occurred_at, user_id')
    .eq('anon_id', anonId)
    .order('occurred_at', { ascending: false })
    .limit(500);
  const events = (eventsRes.data ?? []) as EventRow[];

  const userId = events.find((e) => e.user_id)?.user_id ?? null;

  const [savedSearchesRes, contactByAnonRes] = await Promise.all([
    supabase
      .from('saved_searches')
      .select('id, page, filters, display_name, notify_chat_id, notify_phone, active, created_at')
      .or(userId ? `anon_id.eq.${anonId},user_id.eq.${userId}` : `anon_id.eq.${anonId}`)
      .order('created_at', { ascending: false }),
    supabase
      .from('contact_requests')
      .select('id, listing_id, channel, status, buyer_phone, created_at')
      .eq('anon_id', anonId)
      .order('created_at', { ascending: false }),
  ]);

  let savedItems: SavedItemRow[] = [];
  let contactByUser: ContactRequestRow[] = [];
  let identity: { phone: string; tg_username: string | null } | null = null;

  if (userId) {
    const [savedItemsRes, contactByUserRes, userRes] = await Promise.all([
      supabase
        .from('saved_items')
        .select('id, building_id, listing_id, saved_at')
        .eq('user_id', userId)
        .order('saved_at', { ascending: false }),
      supabase
        .from('contact_requests')
        .select('id, listing_id, channel, status, buyer_phone, created_at')
        .eq('buyer_user_id', userId)
        .order('created_at', { ascending: false }),
      supabase.from('users').select('phone, tg_username').eq('id', userId).maybeSingle(),
    ]);
    savedItems = (savedItemsRes.data ?? []) as SavedItemRow[];
    contactByUser = (contactByUserRes.data ?? []) as ContactRequestRow[];
    if (userRes.data) {
      identity = {
        phone: userRes.data.phone as string,
        tg_username: (userRes.data.tg_username as string | null) ?? null,
      };
    }
  }

  // Merge contact requests by id (the same row can match both anon_id
  // and buyer_user_id once stitching has happened).
  const contactRequests: ContactRequestRow[] = [];
  const seenContactIds = new Set<string>();
  for (const r of [...((contactByAnonRes.data ?? []) as ContactRequestRow[]), ...contactByUser]) {
    if (seenContactIds.has(r.id)) continue;
    seenContactIds.add(r.id);
    contactRequests.push(r);
  }

  const occurredTimes = events.map((e) => e.occurred_at);
  const firstSeen = occurredTimes.length ? occurredTimes[occurredTimes.length - 1]! : null;
  const lastSeen = occurredTimes.length ? occurredTimes[0]! : null;

  return {
    events,
    savedSearches: (savedSearchesRes.data ?? []) as SavedSearchRow[],
    savedItems,
    contactRequests,
    identity,
    firstSeen,
    lastSeen,
  };
}

/**
 * Pulls dominant filter values out of the visitor's search_run +
 * search_no_results events, plus saved_searches. Returns a structured
 * BuyerProfile that the per-visitor UI can render in one paragraph.
 */
export function deriveBuyerProfile(bundle: VisitorBundle): BuyerProfile {
  // Roll up filter values from every search-shaped event + saved
  // search this visitor has produced.
  const roomCounts = new Map<string, number>();
  const districtCounts = new Map<string, number>();
  const finishingCounts = new Map<string, number>();
  const stageCounts = new Map<string, number>();
  let priceMin: number | null = null;
  let priceMax: number | null = null;
  let searchCount = 0;
  let noResultCount = 0;
  let pageViewCount = 0;
  let contactClickCount = 0;
  const listingSlugCounts = new Map<string, number>();
  const buildingSlugCounts = new Map<string, number>();

  function incCsv(map: Map<string, number>, value: unknown) {
    if (typeof value !== 'string' || !value.trim()) return;
    for (const v of value.split(',').map((s) => s.trim()).filter(Boolean)) {
      map.set(v, (map.get(v) ?? 0) + 1);
    }
  }
  function incArray(map: Map<string, number>, value: unknown) {
    if (Array.isArray(value)) {
      for (const v of value) {
        if (typeof v === 'string' && v) map.set(v, (map.get(v) ?? 0) + 1);
      }
    } else {
      incCsv(map, value);
    }
  }

  function ingestFilters(filters: unknown) {
    if (!filters || typeof filters !== 'object') return;
    const f = filters as Record<string, unknown>;
    incArray(roomCounts, f.rooms);
    incArray(districtCounts, f.district);
    incArray(finishingCounts, f.finishing);
    incArray(stageCounts, f.status);
    const lo = numberOrNull(f.price_from);
    const hi = numberOrNull(f.price_to);
    if (lo != null) priceMin = priceMin == null ? lo : Math.max(priceMin, lo);
    if (hi != null) priceMax = priceMax == null ? hi : Math.min(priceMax, hi);
  }

  for (const e of bundle.events) {
    if (e.event_type === 'page_view') {
      pageViewCount++;
      const path = (e.properties as { pathname?: string }).pathname ?? '';
      const m = path.match(/\/(kvartira|zhk)\/([^/?#]+)/);
      if (m) {
        const slug = m[2]!;
        if (m[1] === 'kvartira') {
          listingSlugCounts.set(slug, (listingSlugCounts.get(slug) ?? 0) + 1);
        } else {
          buildingSlugCounts.set(slug, (buildingSlugCounts.get(slug) ?? 0) + 1);
        }
      }
    } else if (e.event_type === 'search_run') {
      searchCount++;
      ingestFilters((e.properties as { filters?: unknown }).filters);
    } else if (e.event_type === 'search_no_results') {
      noResultCount++;
      ingestFilters((e.properties as { filters?: unknown }).filters);
    } else if (e.event_type === 'listing_card_click') {
      const slug = (e.properties as { listing_slug?: string }).listing_slug;
      if (slug) listingSlugCounts.set(slug, (listingSlugCounts.get(slug) ?? 0) + 1);
    } else if (e.event_type === 'building_card_click') {
      const slug = (e.properties as { building_slug?: string }).building_slug;
      if (slug) buildingSlugCounts.set(slug, (buildingSlugCounts.get(slug) ?? 0) + 1);
    } else if (e.event_type === 'contact_button_click') {
      contactClickCount++;
    }
  }
  for (const s of bundle.savedSearches) {
    ingestFilters(s.filters);
  }

  function rank(map: Map<string, number>): string[] {
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }

  return {
    dominantRooms: rank(roomCounts)[0] ?? null,
    priceBandTjs:
      priceMin != null || priceMax != null ? { min: priceMin, max: priceMax } : null,
    districts: rank(districtCounts),
    finishings: rank(finishingCounts),
    stages: rank(stageCounts),
    topListingSlugs: rank(listingSlugCounts).slice(0, 5),
    topBuildingSlugs: rank(buildingSlugCounts).slice(0, 5),
    pageViewCount,
    searchCount,
    noResultCount,
    contactClickCount,
    leadTemp: deriveLeadTemp({
      bundle,
      pageViewCount,
      contactClickCount,
    }),
  };
}

/**
 * Lead-temperature heuristic. Hot = high-intent + uncontacted. Warm =
 * showing interest. Cold = drive-by. The thresholds are V1 guesses;
 * we'll tune once we see real volume.
 */
function deriveLeadTemp(input: {
  bundle: VisitorBundle;
  pageViewCount: number;
  contactClickCount: number;
}): 'cold' | 'warm' | 'hot' {
  const { bundle, pageViewCount, contactClickCount } = input;
  const savesCount = bundle.savedItems.length + bundle.savedSearches.length;
  const hasContacted = contactClickCount > 0 || bundle.contactRequests.length > 0;
  // HOT: viewed real inventory AND committed (saved or subscribed) AND
  // didn't reach out yet — these are the people the founder should
  // call first.
  const listingViewCount = bundle.events.filter(
    (e) => e.event_type === 'page_view' && (e.properties as { pathname?: string }).pathname?.startsWith('/kvartira/'),
  ).length;
  if (listingViewCount >= 3 && savesCount >= 1 && !hasContacted) return 'hot';
  // WARM: signs of intent without conversion.
  if (savesCount >= 1 || listingViewCount >= 2 || bundle.savedSearches.length > 0) return 'warm';
  if (pageViewCount >= 5 && !hasContacted) return 'warm';
  return 'cold';
}

/**
 * Walks the visitor's events looking for friction patterns.
 *  - typing in CallbackWidget but never submitting
 *  - repeat 0-result searches in same browse session
 *  - viewing the same listing 3+ times without saving it
 *  - failed save attempts (intent without follow-through)
 */
export function deriveFrictions(bundle: VisitorBundle): FrictionSignal[] {
  const out: FrictionSignal[] = [];
  // Map listing_id → page_view count (kvartira/<slug>)
  const listingViewCounts = new Map<string, { count: number; lastSeen: string; slug: string }>();
  let typedNoSubmit: string | null = null;
  let repeatedNoResultsLastSeen: string | null = null;
  let prevNoResultAt: string | null = null;
  let saveAttempts: { count: number; last: string } | null = null as { count: number; last: string } | null;

  for (const e of bundle.events) {
    if (e.event_type === 'page_view') {
      const path = (e.properties as { pathname?: string }).pathname ?? '';
      const m = path.match(/\/kvartira\/([^/?#]+)/);
      if (m) {
        const slug = m[1]!;
        const cur = listingViewCounts.get(slug);
        if (cur) {
          cur.count++;
          cur.lastSeen = e.occurred_at;
        } else {
          listingViewCounts.set(slug, { count: 1, lastSeen: e.occurred_at, slug });
        }
      }
    } else if (e.event_type === 'callback_widget_typed_no_submit') {
      typedNoSubmit = e.occurred_at;
    } else if (e.event_type === 'search_no_results') {
      // Two no-results within 10 minutes of each other = repeat pattern.
      if (prevNoResultAt) {
        const diffMin = (new Date(prevNoResultAt).getTime() - new Date(e.occurred_at).getTime()) / 60000;
        if (Math.abs(diffMin) < 10) repeatedNoResultsLastSeen = prevNoResultAt;
      }
      prevNoResultAt = e.occurred_at;
    } else if (e.event_type === 'save_attempt_logged_out') {
      const cur: { count: number; last: string } | null = saveAttempts;
      saveAttempts = { count: (cur?.count ?? 0) + 1, last: e.occurred_at };
    } else if (e.event_type === 'listing_revisit') {
      const slug = (e.properties as { listing_slug?: string }).listing_slug ?? '?';
      out.push({
        key: `revisit-${slug}-${e.occurred_at}`,
        label: `Открыли квартиру /kvartira/${slug} 3+ раза за сутки — высокий интерес`,
        lastSeen: e.occurred_at,
      });
    }
  }

  // Listing revisits inferred from view counts (in case the
  // listing_revisit detector hasn't fired in this window).
  for (const [slug, info] of listingViewCounts) {
    if (info.count >= 3 && !bundle.savedItems.some((s) => s.listing_id && s.listing_id === slug)) {
      out.push({
        key: `views-${slug}`,
        label: `Просмотрели /kvartira/${slug} ${info.count}× — но не сохранили`,
        lastSeen: info.lastSeen,
      });
    }
  }

  if (typedNoSubmit) {
    out.push({
      key: 'callback-typed-no-submit',
      label: 'Начали оставлять номер в форме обратного звонка, но не отправили',
      lastSeen: typedNoSubmit,
    });
  }
  if (repeatedNoResultsLastSeen) {
    out.push({
      key: 'repeat-no-results',
      label: 'Несколько поисков подряд вернули 0 результатов — каталог не покрывает их запрос',
      lastSeen: repeatedNoResultsLastSeen,
    });
  }
  if (saveAttempts && saveAttempts.count >= 1) {
    out.push({
      key: 'save-attempts-logged-out',
      label: `Пытались сохранить ${saveAttempts.count}× без входа — намерение есть, но не дошли до Telegram`,
      lastSeen: saveAttempts.last,
    });
  }

  return out;
}

/**
 * Identifies "hot leads" across the whole event window. A hot lead is
 * a visitor with strong interest (multiple listing views + at least
 * one save/subscribe) who has NOT submitted a contact_request yet —
 * exactly the pool the founder should reach out to.
 */
export interface HotLead {
  anonId: string;
  userId: string | null;
  identity: { phone: string; tg_username: string | null } | null;
  listingViewCount: number;
  saveCount: number;
  savedSearchCount: number;
  lastSeen: string;
}

export async function findHotLeads(input: {
  fromIso: string;
  excludeUserIds: Set<string>;
}): Promise<HotLead[]> {
  const supabase = createAdminClient();

  // Pull every event in the window — we group by anon_id in JS.
  const { data: events } = await supabase
    .from('events')
    .select('anon_id, user_id, event_type, properties, occurred_at')
    .gte('occurred_at', input.fromIso)
    .order('occurred_at', { ascending: false })
    .limit(20000);
  if (!events) return [];

  const perVisitor = new Map<
    string,
    { userId: string | null; listingViews: number; lastSeen: string; hadContactClick: boolean }
  >();
  for (const e of events) {
    const anonId = e.anon_id as string;
    const cur = perVisitor.get(anonId) ?? { userId: null, listingViews: 0, lastSeen: e.occurred_at as string, hadContactClick: false };
    if (e.user_id) cur.userId = e.user_id as string;
    if (e.event_type === 'page_view') {
      const path = ((e.properties ?? {}) as { pathname?: string }).pathname ?? '';
      if (path.startsWith('/kvartira/')) cur.listingViews++;
    }
    if (e.event_type === 'contact_button_click' || e.event_type === 'callback_request_submitted') {
      cur.hadContactClick = true;
    }
    perVisitor.set(anonId, cur);
  }

  const candidateAnonIds = [...perVisitor.entries()]
    .filter(([, v]) => v.listingViews >= 3 && !v.hadContactClick)
    .filter(([, v]) => !v.userId || !input.excludeUserIds.has(v.userId))
    .map(([k]) => k);

  if (candidateAnonIds.length === 0) return [];

  // For each candidate, count their saves + saved searches in one go.
  const [savedSearchesRes, savedItemsRes] = await Promise.all([
    supabase
      .from('saved_searches')
      .select('anon_id, user_id')
      .in('anon_id', candidateAnonIds),
    // saved_items only ties to user_id; map via the candidates' user_ids.
    (async () => {
      const userIds = candidateAnonIds
        .map((a) => perVisitor.get(a)?.userId)
        .filter((x): x is string => Boolean(x));
      if (userIds.length === 0) return { data: [] as { user_id: string }[] };
      return supabase.from('saved_items').select('user_id').in('user_id', userIds);
    })(),
  ]);

  const savedSearchPerAnon = new Map<string, number>();
  for (const r of (savedSearchesRes.data ?? []) as { anon_id: string }[]) {
    savedSearchPerAnon.set(r.anon_id, (savedSearchPerAnon.get(r.anon_id) ?? 0) + 1);
  }
  const savedItemPerUser = new Map<string, number>();
  for (const r of (savedItemsRes.data ?? []) as { user_id: string }[]) {
    savedItemPerUser.set(r.user_id, (savedItemPerUser.get(r.user_id) ?? 0) + 1);
  }

  const hotLeads: HotLead[] = [];
  for (const anonId of candidateAnonIds) {
    const v = perVisitor.get(anonId)!;
    const saveCount = v.userId ? savedItemPerUser.get(v.userId) ?? 0 : 0;
    const savedSearchCount = savedSearchPerAnon.get(anonId) ?? 0;
    if (saveCount + savedSearchCount === 0) continue; // hot requires saves or subscribed
    hotLeads.push({
      anonId,
      userId: v.userId,
      identity: null, // hydrated below
      listingViewCount: v.listingViews,
      saveCount,
      savedSearchCount,
      lastSeen: v.lastSeen,
    });
  }

  // Hydrate identity (phone + tg_username) for the identified leads.
  const identifiedUserIds = hotLeads.map((h) => h.userId).filter((x): x is string => Boolean(x));
  if (identifiedUserIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, phone, tg_username')
      .in('id', [...new Set(identifiedUserIds)]);
    const byId = new Map(
      (users ?? []).map((u) => [
        u.id as string,
        { phone: u.phone as string, tg_username: (u.tg_username as string | null) ?? null },
      ]),
    );
    for (const h of hotLeads) {
      if (h.userId) h.identity = byId.get(h.userId) ?? null;
    }
  }

  hotLeads.sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));
  return hotLeads;
}

/** Returns the set of user_ids the operator has flagged as staff
 *  (admin/staff in user_roles). Used to default-exclude operator
 *  activity from the dashboard so the founder's own browsing doesn't
 *  pollute the numbers. */
export async function getStaffUserIds(): Promise<Set<string>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'staff']);
  return new Set((data ?? []).map((r) => r.user_id as string));
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
