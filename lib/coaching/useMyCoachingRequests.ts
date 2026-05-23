'use client';

import useSWR from 'swr';
import { createClient } from '@/lib/supabase/client';

export type CoachingResponse = {
  body: string;
  created_at: string;
};

export type MyCoachingRequest = {
  id: string;
  fen: string;
  body: string;
  created_at: string;
  responses: CoachingResponse[];
};

// Keyed by fen so each LongThinkCard can answer "do I have a request
// for this position?" with a single hash lookup.
export type CoachingRequestsByFen = Record<string, MyCoachingRequest>;

type FetchKey = readonly ['coaching-requests', 'mine'];

const fetcher = async (): Promise<CoachingRequestsByFen> => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('coaching_requests')
    .select(
      `
        id,
        fen,
        body,
        created_at,
        coaching_responses (
          body,
          created_at
        )
      `,
    )
    .order('created_at', { ascending: false });

  if (error || !data) return {};

  return Object.fromEntries(
    data.map((r) => [
      r.fen,
      {
        id: r.id,
        fen: r.fen,
        body: r.body,
        created_at: r.created_at,
        responses: r.coaching_responses ?? [],
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
