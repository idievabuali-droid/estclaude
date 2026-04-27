/**
 * Benchmarks service — pulls district price benchmarks for the
 * fairness indicator. Per Data Model §5.14, the indicator is hidden
 * when sample_size < 5 (the service surfaces this constraint).
 */
import { createClient } from '@/lib/supabase/server';

export type Benchmark = {
  median_per_m2_dirams: bigint;
  sample_size: number;
};

/**
 * Returns the all-rooms / all-finishings benchmark for a district.
 * Returns null when no row exists or sample_size < 5.
 */
export async function getDistrictBenchmark(districtId: string): Promise<Benchmark | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('district_price_benchmarks')
    .select('sample_size, median_price_per_m2_dirams')
    .eq('district_id', districtId)
    .is('rooms_count', null)
    .is('finishing_type', null)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data || data.sample_size < 5) return null;
  return {
    median_per_m2_dirams: BigInt(data.median_price_per_m2_dirams),
    sample_size: data.sample_size,
  };
}

/**
 * Batch helper — fetches benchmarks for many districts in one query.
 * Returns a Map keyed by district_id (only includes rows with sample >= 5).
 */
export async function getDistrictBenchmarks(
  districtIds: string[],
): Promise<Map<string, Benchmark>> {
  if (districtIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('district_price_benchmarks')
    .select('district_id, sample_size, median_price_per_m2_dirams')
    .in('district_id', districtIds)
    .is('rooms_count', null)
    .is('finishing_type', null);
  if (error) throw error;
  const out = new Map<string, Benchmark>();
  for (const r of data ?? []) {
    if (r.sample_size < 5) continue;
    out.set(r.district_id, {
      median_per_m2_dirams: BigInt(r.median_price_per_m2_dirams),
      sample_size: r.sample_size,
    });
  }
  return out;
}
