import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { useGamesPages } from '@/lib/games/useGamesPages';
import { PlayerNotFoundError } from '@/lib/games/errors';
import type { Game, GamesPage } from '@/lib/games/types';

const makeGame = (id: string): Game => ({
  id,
  url: '',
  pgn: '',
  endTime: new Date(),
  timeClass: 'blitz',
  timeControl: '180',
  increment: 0,
  userColor: 'white',
  user: { username: 'alice', rating: 1500 },
  opponent: { username: 'bob', rating: 1700 },
  result: 'draw',
  finalFen: '',
  clockSnapshots: [],
});

const page = (ids: string[], nextCursor: number | null): GamesPage => ({
  games: ids.map(makeGame),
  nextCursor,
});

// Fresh SWR cache per test so pages from one case never leak into another.
function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

function render(fetchPage: jest.Mock, username: string | null = 'alice') {
  return renderHook(
    ({ name }: { name: string | null }) =>
      useGamesPages('lichess-games', name, fetchPage),
    { wrapper, initialProps: { name: username } },
  );
}

const ids = (games: Game[] | null) => games?.map((g) => g.id);

describe('useGamesPages', () => {
  it('loads the first page with cursor null and GAMES_LIMIT', async () => {
    const fetchPage = jest.fn().mockResolvedValue(page(['a'], 10));
    const { result } = render(fetchPage);

    await waitFor(() => expect(ids(result.current.games)).toEqual(['a']));
    expect(fetchPage).toHaveBeenCalledWith('alice', null, 50);
    expect(result.current.hasMore).toBe(true);
  });

  it('appends the next page without refetching page 1', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page(['a'], 10))
      .mockResolvedValueOnce(page(['b'], null));
    const { result } = render(fetchPage);
    await waitFor(() => expect(result.current.games).not.toBeNull());

    act(() => result.current.loadMore());

    await waitFor(() => expect(ids(result.current.games)).toEqual(['a', 'b']));
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenLastCalledWith('alice', 10, 50);
    expect(result.current.hasMore).toBe(false);
  });

  it('de-duplicates games by id across pages', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page(['a'], 10))
      .mockResolvedValueOnce(page(['a', 'b'], null));
    const { result } = render(fetchPage);
    await waitFor(() => expect(result.current.games).not.toBeNull());

    act(() => result.current.loadMore());

    await waitFor(() => expect(ids(result.current.games)).toEqual(['a', 'b']));
  });

  it('keeps page 1 and sets loadMoreError when page 2 fails, then retries', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page(['a'], 10))
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(page(['b'], null));
    const { result } = render(fetchPage);
    await waitFor(() => expect(result.current.games).not.toBeNull());

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.loadMoreError).not.toBeNull());
    expect(ids(result.current.games)).toEqual(['a']);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoadingMore).toBe(false);

    act(() => result.current.loadMore());

    await waitFor(() => expect(ids(result.current.games)).toEqual(['a', 'b']));
    expect(fetchPage).toHaveBeenLastCalledWith('alice', 10, 50);
    expect(result.current.loadMoreError).toBeNull();
  });

  it('reports first-page failures through error/isNotFound', async () => {
    const fetchPage = jest
      .fn()
      .mockRejectedValue(new PlayerNotFoundError('ghost'));
    const { result } = render(fetchPage);

    await waitFor(() => expect(result.current.isNotFound).toBe(true));
    expect(result.current.error).toBeInstanceOf(PlayerNotFoundError);
    expect(result.current.loadMoreError).toBeNull();
    expect(result.current.games).toBeNull();
  });

  it('resets to page 1 when the username changes', async () => {
    const fetchPage = jest.fn((username: string, cursor: number | null) =>
      Promise.resolve(
        username === 'bob'
          ? page(['bob-1'], null)
          : cursor === null
            ? page(['a'], 10)
            : page(['b'], null),
      ),
    );
    const { result, rerender } = render(fetchPage);
    await waitFor(() => expect(result.current.games).not.toBeNull());
    act(() => result.current.loadMore());
    await waitFor(() => expect(ids(result.current.games)).toEqual(['a', 'b']));

    rerender({ name: 'bob' });

    await waitFor(() => expect(ids(result.current.games)).toEqual(['bob-1']));
    expect(fetchPage).toHaveBeenCalledWith('bob', null, 50);
  });

  it('does nothing when username is null', () => {
    const fetchPage = jest.fn();
    const { result } = render(fetchPage, null);

    expect(fetchPage).not.toHaveBeenCalled();
    expect(result.current.games).toBeNull();
    expect(result.current.hasMore).toBe(false);
  });
});
