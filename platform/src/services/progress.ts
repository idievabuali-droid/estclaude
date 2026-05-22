/**
 * Construction-progress service. Backs WEDGE-1 — the /zhk/[slug]/progress
 * timeline page. Returns photos with kind='progress' grouped by the date
 * they were taken (taken_at), newest day first.
 */
import { createClient } from '@/lib/supabase/server';

export type ProgressPhoto = {
  id: string;
  storage_path: string;
  taken_at: string;
  /** Day bucket like "2026-05-22" for grouping in the UI. */
  dateKey: string;
};

export type ProgressDay = {
  dateKey: string;
  /** Pre-formatted Russian label like "22 мая 2026". */
  label: string;
  photos: ProgressPhoto[];
};

// Genitive month names — a Russian date reads "22 мая", not "22 май".
const RU_MONTHS_GEN = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

function dateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-');
  return `${parseInt(d!, 10)} ${RU_MONTHS_GEN[parseInt(m!, 10) - 1]} ${y}`;
}

export async function getBuildingProgress(buildingId: string): Promise<ProgressDay[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_path, taken_at, display_order')
    .eq('building_id', buildingId)
    .eq('kind', 'progress')
    .order('taken_at', { ascending: false })
    .order('display_order', { ascending: true });
  if (error) throw error;

  const photos: ProgressPhoto[] = (data ?? []).map((r) => {
    // taken_at is nullable — a photo uploaded before the date picker
    // landed has none. Fall back to "now" so it still renders; it
    // groups under today until the founder re-uploads it with a date.
    const taken = r.taken_at ?? new Date().toISOString();
    return {
      id: r.id,
      storage_path: r.storage_path,
      taken_at: taken,
      dateKey: taken.slice(0, 10), // YYYY-MM-DD
    };
  });

  // Group by exact day. Newest day first, so a back-dated photo sorts
  // below the fresher ones — the founder adds older photos and they
  // land further down the timeline, exactly as a buyer expects.
  const groups = new Map<string, ProgressPhoto[]>();
  for (const p of photos) {
    if (!groups.has(p.dateKey)) groups.set(p.dateKey, []);
    groups.get(p.dateKey)!.push(p);
  }

  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dateKey, dayPhotos]) => ({
      dateKey,
      label: dateLabel(dateKey),
      photos: dayPhotos,
    }));
}
