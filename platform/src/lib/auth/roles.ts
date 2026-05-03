/**
 * Role helpers — small wrappers around the user_roles table for
 * checks we need throughout the app (founder = direct publish; others
 * = moderation queue).
 *
 * The `user_roles` schema (from migration 0002) has roles enum:
 * 'buyer' | 'seller' | 'staff' | 'admin'. We treat staff/admin as
 * "founder" for V1 — both bypass the moderation queue and can manage
 * other users' submissions.
 */
import { createAdminClient } from '@/lib/supabase/admin';

const FOUNDER_ROLES = ['admin', 'staff'] as const;

/**
 * Returns true if the user has staff or admin role — i.e. is a
 * founder/operator who can publish listings directly and approve
 * other people's submissions.
 *
 * Uses the admin client so RLS doesn't block the read (user_roles
 * has its own RLS policy that requires auth.uid() = user_id, which
 * doesn't apply with our cookie-session auth pattern).
 */
export async function isFounder(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .in('role', FOUNDER_ROLES)
    .limit(1)
    .maybeSingle();
  return data != null;
}
