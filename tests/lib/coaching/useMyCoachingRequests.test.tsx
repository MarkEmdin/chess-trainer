import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { useMyCoachingRequests } from '@/lib/coaching/useMyCoachingRequests';

const eq = jest.fn();
let user: { id: string } | null = { id: 'u1' };
const rows = [
  {
    id: 'r1',
    fen: 'FEN',
    body: 'q',
    created_at: '2026-10-23T12:00:00Z',
    variation: null,
    content: null,
    move_index: 3,
    pgn: null,
    response_seen_at: null,
    coaching_responses: [],
  },
];

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => {
      const builder = {
        select: () => builder,
        eq: (column: string, value: string) => {
          eq(column, value);
          return builder;
        },
        order: async () => ({ data: rows, error: null }),
      };
      return builder;
    },
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

beforeEach(() => {
  eq.mockClear();
  user = { id: 'u1' };
});

describe('useMyCoachingRequests', () => {
  it('reads only the signed-in user’s requests, with the read state', async () => {
    const { result } = renderHook(() => useMyCoachingRequests(true), {
      wrapper,
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(result.current.data?.FEN.response_seen_at).toBeNull();
  });

  it('returns nothing without a session', async () => {
    user = null;
    const { result } = renderHook(() => useMyCoachingRequests(true), {
      wrapper,
    });
    await waitFor(() => expect(result.current.data).toEqual({}));
    expect(eq).not.toHaveBeenCalled();
  });
});
