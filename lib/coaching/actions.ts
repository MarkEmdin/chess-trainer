'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { after } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/site';
import {
  notifyAdminsOfQuestion,
  notifyStudentOfAnswer,
} from '@/lib/telegram/notify';
import { getAuthedUser } from '@/lib/auth/getUser';
import { replayAroundKey } from '@/lib/chess/replay';
import { parseVariationField, playVariation } from '@/lib/chess/variation';
import { MAX_BODY_LENGTH, normalizeBody } from './body';
import {
  contentToPlainText,
  parseContent,
  type MessageContent,
} from './content';

export type CoachingRequestState =
  | { error: string }
  | { success: true; requestId: string }
  | undefined;

export type RespondState = { error: string } | { success: true } | undefined;

// Optional `variation` field: null when absent, the SAN list when it is a
// legal line from `fen`, 'invalid' otherwise (bad JSON or an illegal move).
function readVariation(
  formData: FormData,
  fen: string,
): string[] | null | 'invalid' {
  const parsed = parseVariationField(formData.get('variation'));
  if (parsed === null || parsed === 'invalid') return parsed;
  return playVariation(fen, parsed) ? parsed : 'invalid';
}

type MessageFields =
  | {
      body: string;
      variation: string[] | null;
      content: MessageContent | null;
    }
  | { error: 'missingFields' | 'bodyTooLong' | 'invalidVariation' };

// The message itself, for a question or an answer. An inline-editor message
// sends `content`; its `body` is rebuilt here, never taken from the form.
// Older clients send `body` plus an optional single `variation`.
function readMessage(formData: FormData, fen: string): MessageFields {
  const content = parseContent(formData.get('content'), fen);
  if (content === 'invalid') return { error: 'invalidVariation' };

  const body = content
    ? contentToPlainText(fen, content).trim()
    : normalizeBody(String(formData.get('body') ?? '')).trim();
  if (!body) return { error: 'missingFields' };
  if (body.length > MAX_BODY_LENGTH) return { error: 'bodyTooLong' };
  if (content) return { body, variation: null, content };

  const variation = readVariation(formData, fen);
  if (variation === 'invalid') return { error: 'invalidVariation' };
  return { body, variation, content: null };
}

function messageError(
  t: Awaited<ReturnType<typeof getTranslations>>,
  error: 'missingFields' | 'bodyTooLong' | 'invalidVariation',
): string {
  return error === 'bodyTooLong'
    ? t('bodyTooLong', { max: MAX_BODY_LENGTH })
    : t(error);
}

const MAX_PGN_LENGTH = 100_000;

// Optional `pgn` field: kept only when it replays to `fen` before move
// `moveIndex`. Anything else is dropped to null: a broken PGN must never
// block the question itself.
function readPgn(
  formData: FormData,
  fen: string,
  moveIndex: number,
): string | null {
  const pgn = String(formData.get('pgn') ?? '');
  if (!pgn || pgn.length > MAX_PGN_LENGTH) return null;
  return replayAroundKey(pgn, fen, moveIndex) ? pgn : null;
}

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

  if (!game_url || !fen || !move_san || !Number.isInteger(move_index)) {
    return { error: t('missingFields') };
  }

  const message = readMessage(formData, fen);
  if ('error' in message) return { error: messageError(t, message.error) };
  const { body, variation, content } = message;

  const pgn = readPgn(formData, fen, move_index);

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
      variation,
      content,
      pgn,
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

  const origin = (await headers()).get('origin') ?? SITE_URL;
  after(() => notifyAdminsOfQuestion(data.id, origin));
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

  if (!request_id) {
    return { error: t('missingFields') };
  }

  const user = await getAuthedUser();
  if (!user || user.role !== 'admin') {
    return { error: t('notAdmin') };
  }

  const supabase = await createClient();

  // The answer's variation starts from the question's position.
  const { data: request } = await supabase
    .from('coaching_requests')
    .select('fen')
    .eq('id', request_id)
    .single();

  if (!request) {
    return { error: t('missingFields') };
  }

  // Validated against the stored position, never a fen from the form.
  const message = readMessage(formData, request.fen);
  if ('error' in message) return { error: messageError(t, message.error) };
  const { body, variation, content } = message;

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
    .insert({ request_id, body, variation, content });

  if (error) {
    return { error: error.message };
  }

  // Refresh the admin dashboard so the form swaps to read-only mode, the
  // student's thread list so the answer shows up there, and the layout so
  // the header bell recounts.
  revalidatePath('/[locale]/admin', 'page');
  revalidatePath('/[locale]/coaching', 'page');
  revalidatePath('/[locale]', 'layout');
  const origin = (await headers()).get('origin') ?? SITE_URL;
  after(() => notifyStudentOfAnswer(request_id, origin));
  return { success: true };
}

// Student-side: the answer was opened in full (spec 012). The RPC only
// touches the caller's own, still-unseen request. Never throws: if it
// fails, the "new" badge just stays.
export async function markResponseSeen(requestId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('mark_coaching_response_seen', {
      p_request_id: requestId,
    });
    if (error) return;
    revalidatePath('/[locale]', 'layout');
  } catch {
    // Offline or similar: nothing to recover.
  }
}
