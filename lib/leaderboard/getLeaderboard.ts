import { createClient } from '@/lib/supabase/server';
import type { LeaderboardRow } from './types';

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('weekly_leaderboard');
  // Throwing lets app/[locale]/error.tsx show its retry screen.
  if (error) throw new Error(error.message);
  return data ?? [];
}
