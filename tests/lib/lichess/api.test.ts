import { fetchGamesPage } from '@/lib/lichess/api';
import { PlayerNotFoundError } from '@/lib/games/errors';
import type { LichessGame } from '@/lib/lichess/types';

function makeRawGame(overrides: Partial<LichessGame> = {}): LichessGame {
  return {
    id: 'game1',
    rated: true,
    speed: 'blitz',
    createdAt: 1_714_780_000_000,
    lastMoveAt: 1_714_780_120_000,
    status: 'mate',
    players: {
      white: { user: { name: 'alice', id: 'alice' }, rating: 1500 },
      black: { user: { name: 'bob', id: 'bob' }, rating: 1700 },
    },
    winner: 'white',
    opening: { eco: 'C50', name: 'Italian Game', ply: 4 },
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5',
    clock: { initial: 180, increment: 0, totalTime: 180 },
    clocks: [17800, 17750, 17700, 17650, 17600, 17550],
    ...overrides,
  };
}

function ndjsonResponse(games: LichessGame[], status = 200) {
  const body = games.map((g) => JSON.stringify(g)).join('\n');
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  };
}

// First page as a plain list — keeps the normalizer cases terse.
const fetchGames = (username: string) =>
  fetchGamesPage(username, null, 10).then((page) => page.games);

function mockFetch(response: ReturnType<typeof ndjsonResponse>) {
  const mock = jest.fn().mockResolvedValue(response);
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe('fetchGamesPage (Lichess)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws PlayerNotFoundError on a 404', async () => {
    mockFetch(ndjsonResponse([], 404));
    await expect(fetchGames('ghost')).rejects.toBeInstanceOf(
      PlayerNotFoundError,
    );
  });

  it('returns an empty list for an account with no games', async () => {
    mockFetch(ndjsonResponse([]));
    await expect(fetchGames('newbie')).resolves.toEqual([]);
  });

  it('normalizes a game where the requested user is white', async () => {
    mockFetch(ndjsonResponse([makeRawGame()]));
    const [game] = await fetchGames('alice');

    expect(game.id).toBe('game1');
    expect(game.url).toBe('https://lichess.org/game1');
    expect(game.userColor).toBe('white');
    expect(game.user).toEqual({ username: 'alice', rating: 1500 });
    expect(game.opponent).toEqual({ username: 'bob', rating: 1700 });
    expect(game.result).toBe('win');
    expect(game.opening).toBe('Italian Game');
    expect(game.increment).toBe(0);
    expect(game.timeClass).toBe('blitz');
  });

  it('normalizes a game where the requested user is black and lost', async () => {
    mockFetch(ndjsonResponse([makeRawGame({ winner: 'white' })]));
    const [game] = await fetchGames('bob');

    expect(game.userColor).toBe('black');
    expect(game.result).toBe('loss');
  });

  it('marks a drawn game (no winner) as a draw', async () => {
    mockFetch(ndjsonResponse([makeRawGame({ winner: undefined })]));
    const [game] = await fetchGames('alice');
    expect(game.result).toBe('draw');
  });

  it('converts centisecond clocks to seconds in clockSnapshots', async () => {
    mockFetch(ndjsonResponse([makeRawGame()]));
    const [game] = await fetchGames('alice');

    expect(game.clockSnapshots[0]).toEqual({
      whiteSeconds: 180,
      blackSeconds: 180,
    });
    expect(game.clockSnapshots[1]).toEqual({
      whiteSeconds: 178,
      blackSeconds: 180,
    });
  });

  it('maps ultraBullet and correspondence onto the existing 4 time classes', async () => {
    mockFetch(
      ndjsonResponse([makeRawGame({ speed: 'correspondence', id: 'g2' })]),
    );
    const [game] = await fetchGames('alice');
    expect(game.timeClass).toBe('daily');
  });

  it('omits until on the first page', async () => {
    const mock = mockFetch(ndjsonResponse([makeRawGame()]));
    await fetchGamesPage('alice', null, 10);
    expect(mock.mock.calls[0][0]).not.toContain('until=');
  });

  it('passes until for later pages', async () => {
    const mock = mockFetch(ndjsonResponse([makeRawGame()]));
    await fetchGamesPage('alice', 1_700_000_000_000, 10);
    expect(mock.mock.calls[0][0]).toContain('until=1700000000000');
  });

  it('returns nextCursor = last createdAt - 1 when the page is full', async () => {
    mockFetch(
      ndjsonResponse([
        makeRawGame({ id: 'g1', createdAt: 2000 }),
        makeRawGame({ id: 'g2', createdAt: 1000 }),
      ]),
    );
    const page = await fetchGamesPage('alice', null, 2);
    expect(page.nextCursor).toBe(999);
  });

  it('returns nextCursor null on a short page', async () => {
    mockFetch(
      ndjsonResponse([
        makeRawGame({ id: 'g1', createdAt: 2000 }),
        makeRawGame({ id: 'g2', createdAt: 1000 }),
      ]),
    );
    const page = await fetchGamesPage('alice', null, 3);
    expect(page.nextCursor).toBeNull();
  });
});
