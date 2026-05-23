'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthedUser } from '@/lib/auth/getUser';

export type CoachingRequestState =
  | { error: string }
  | { success: true; requestId: string }
  | undefined;

export type RespondState =
  | { error: string }
  | { success: true }
  | undefined;

const MAX_BODY_LENGTH = 4000;

// User-side: submit a question about a specific long-think position. The
// unique (user_id, fen) constraint at the DB level enforces "one per
// position", so we surface that race-condition error to the form just
// like any other validation failure.
export async function createCoachingRequest(
  _prev: CoachingRequestState,
  formData: FormData,
): Promise<CoachingRequestState> {
  const t = await getTranslations('coaching.errors');

  const game_url = String(formData.get('game_url') ?? '').trim();
  const fen = String(formData.get('fen') ?? '').trim();
  const move_index = Number(formData.get('move_index'));
  const move_san = String(formData.get('move_san') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  if (!game_url || !fen || !move_san || !body || !Number.isInteger(move_index)) {
    return { error: t('missingFields') };
  }

  if (body.length > MAX_BODY_LENGTH) {
    return { error: t('bodyTooLong', { max: MAX_BODY_LENGTH }) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t('notAuthenticated') };
  }

  const { data, error } = await supabase
    .from('coaching_requests')
    .insert({
      user_id: user.id,
      game_url,
      fen,
      move_index,
      move_san,
      body,
    })
    .select('id')
    .single();

  if (error) {
    // Postgres 23505 = unique_violation — translates to "you already
    // asked about this position".
    if (error.code === '23505') {
      return { error: t('alreadyAsked') };
    }
    return { error: error.message };
  }

  return { success: true, requestId: data.id };
}

// Admin-side: write a response to a coaching request. Belt-and-suspenders
// authorization — RLS on coaching_responses already blocks non-admins,
// but explicit role check returns a clean error message instead of a
// silent "0 rows" failure. One response per request is enforced here
// at the action layer (schema permits multiple — keeping the door open
// for threaded replies later without a migration).
export async function respondToRequest(
  _prev: RespondState,
  formData: FormData,
): Promise<RespondState> {
  const t = await getTranslations('coaching.errors');

  const request_id = String(formData.get('request_id') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  if (!request_id || !body) {
    return { error: t('missingFields') };
  }

  if (body.length > 4000) {
    return { error: t('bodyTooLong', { max: 4000 }) };
  }

  const user = await getAuthedUser();
  if (!user || user.role !== 'admin') {
    return { error: t('notAdmin') };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('coaching_responses')
    .select('id')
    .eq('request_id', request_id)
    .maybeSingle();

  if (existing) {
    return { error: t('alreadyResponded') };
  }

  const { error } = await supabase
    .from('coaching_responses')
    .insert({ request_id, body });

  if (error) {
    return { error: error.message };
  }

  // Refresh the admin dashboard so the form swaps to read-only mode.
  revalidatePath('/[locale]/admin', 'page');
  return { success: true };
}
