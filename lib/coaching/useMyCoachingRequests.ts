'use client';

import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';
import { withAuthors } from '@/lib/coaches/authors';
import type { CoachingThreadData } from '@/lib/coaching/types';

export type MyCoachingRequest = CoachingThreadData;

// Keyed by fen so each key-position row can answer "do I have a request
// for this position?" with a single hash lookup.
export type CoachingRequestsByFen = Record<string, MyCoachingRequest>;

type FetchKey = readonly ['coaching-requests', 'mine'];

const fetcher = async (): Promise<CoachingRequestsByFen> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from('coaching_requests')
    .select(
      `
        id,
        fen,
        body,
        created_at,
        variation,
        content,
        move_index,
        pgn,
        response_seen_at,
        coaching_responses (
          body,
          created_at,
          variation,
          content,
          author_id,
          liked
        )
      `,
    )
    // Admins can read every request (RLS); this page is about my own.
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return {};

  const threads = await withAuthors(
    supabase,
    data.map((r) => ({
      ...r,
      responses: r.coaching_responses ?? [],
    })),
  );

  return Object.fromEntries(
    threads.map((r) => [
      r.fen,
      {
        id: r.id,
        fen: r.fen,
        body: r.body,
        created_at: r.created_at,
        variation: r.variation,
        content: r.content,
        move_index: r.move_index,
        pgn: r.pgn,
        response_seen_at: r.response_seen_at,
        responses: r.responses,
      },
    ]),
  );
};

export function useMyCoachingRequests(enabled: boolean) {
  const key: FetchKey | null = enabled ? ['coaching-requests', 'mine'] : null;
  return useSWR<CoachingRequestsByFen, Error>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
}
