/**
 * Construction-progress service. Backs WEDGE-1 — the /zhk/[slug]/progress
 * timeline page. Returns photos with kind='progress' grouped by month.
 */
import { createClient } from '@/lib/supabase/server';

export type ProgressPhoto = {
  id: string;
  storage_path: string;
  taken_at: string;
  /** Month bucket like "2026-04" for grouping in the UI. */
  monthKey: string;
};

export type ProgressMonth = {
  monthKey: string;
  /** Pre-formatted Russian label like "Апрель 2026". */
  label: string;
  photos: ProgressPhoto[];
};

const RU_MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-');
  return `${RU_MONTHS[parseInt(m!, 10) - 1]} ${y}`;
}

export async function getBuildingProgress(buildingId: string): Promise<ProgressMonth[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_path, taken_at')
    .eq('building_id', buildingId)
    .eq('kind', 'progress')
    .order('taken_at', { ascending: false });
  if (error) throw error;

  const photos: ProgressPhoto[] = (data ?? []).map((r) => {
    const taken = r.taken_at ?? new Date().toISOString();
    return {
      id: r.id,
      storage_path: r.storage_path,
      taken_at: taken,
      monthKey: taken.slice(0, 7), // YYYY-MM
    };
  });

  // Group by month
  const groups = new Map<string, ProgressPhoto[]>();
  for (const p of photos) {
    if (!groups.has(p.monthKey)) groups.set(p.monthKey, []);
    groups.get(p.monthKey)!.push(p);
  }

  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([monthKey, photos]) => ({ monthKey, label: monthLabel(monthKey), photos }));
}
