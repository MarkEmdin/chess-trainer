import { fetchLastGames } from '@/lib/chesscom/api';
import { PlayerNotFoundError } from '@/lib/chesscom/errors';

type RawGame = {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  uuid: string;
  fen: string;
  time_class: 'bullet' | 'blitz' | 'rapid' | 'daily';
  rules: string;
  white: {
    rating: number;
    result: string;
    username: string;
    uuid: string;
    '@id': string;
  };
  black: {
    rating: number;
    result: string;
    username: string;
    uuid: string;
    '@id': string;
  };
  eco?: string;
};

function makeRawGame(overrides: Partial<RawGame> = {}): RawGame {
  return {
    url: 'https://www.chess.com/game/live/12345',
    pgn: `[White "alice"]\n[Black "bob"]\n\n1. e4 {[%clk 0:02:55]} e5 {[%clk 0:02:50]} *`,
    time_control: '180',
    end_time: 1_714_780_000,
    rated: true,
    uuid: 'game-1',
    fen: '8/8/8/8/8/8/8/8 w - - 0 1',
    time_class: 'blitz',
    rules: 'chess',
    white: {
      rating: 1500,
      result: 'win',
      username: 'alice',
      uuid: 'a1',
      '@id': 'x',
    },
    black: {
      rating: 1700,
      result: 'checkmated',
      username: 'bob',
      uuid: 'b1',
      '@id': 'y',
    },
    eco: 'https://www.chess.com/openings/Kings-Pawn-Opening',
    ...overrides,
  };
}

// Minimal Response stand-in. JSDOM does not expose `Response` as a global,
// and our api.ts only touches `ok`, `status`, and `.json()` — no need for
// the real WHATWG implementation.
type FakeResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function jsonResponse(body: unknown, status = 200): FakeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function mockFetchSequence(...responses: FakeResponse[]) {
  const mock = jest.fn();
  for (const r of responses) {
    mock.mockResolvedValueOnce(r);
  }
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe('fetchLastGames', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('throws PlayerNotFoundError when the archives endpoint returns 404', async () => {
    mockFetchSequence(jsonResponse(null, 404));
    await expect(fetchLastGames('ghost-user')).rejects.toBeInstanceOf(
      PlayerNotFoundError,
    );
  });

  it('returns an empty list when the archives array is empty', async () => {
    mockFetchSequence(jsonResponse({ archives: [] }));
    await expect(fetchLastGames('newbie')).resolves.toEqual([]);
  });

  it('returns games from the most recent archive in newest-first order', async () => {
    const archives = ['https://api.chess.com/pub/player/alice/games/2026/05'];
    const games = [makeRawGame({ uuid: 'a' }), makeRawGame({ uuid: 'b' })];
    mockFetchSequence(jsonResponse({ archives }), jsonResponse({ games }));

    const result = await fetchLastGames('alice');

    expect(result).toHaveLength(2);
    // Within the month games are reversed so the last one in the archive
    // appears first in our list.
    expect(result[0].id).toBe('b');
    expect(result[1].id).toBe('a');
  });

  it('walks back to older archives when the latest does not fill the limit', async () => {
    const archives = [
      'https://api.chess.com/pub/player/alice/games/2026/04',
      'https://api.chess.com/pub/player/alice/games/2026/05',
    ];
    mockFetchSequence(
      jsonResponse({ archives }),
      jsonResponse({ games: [makeRawGame({ uuid: 'may-1' })] }),
      jsonResponse({
        games: [makeRawGame({ uuid: 'apr-1' }), makeRawGame({ uuid: 'apr-2' })],
      }),
    );

    const result = await fetchLastGames('alice', 3);

    expect(result.map((g) => g.id)).toEqual(['may-1', 'apr-2', 'apr-1']);
  });

  it("normalizes the user side based on the username match (case-insensitive)", async () => {
    mockFetchSequence(
      jsonResponse({
        archives: ['https://api.chess.com/pub/player/Alice/games/2026/05'],
      }),
      jsonResponse({ games: [makeRawGame()] }),
    );

    const [game] = await fetchLastGames('ALICE');

    expect(game.userColor).toBe('white');
    expect(game.user.username).toBe('alice');
    expect(game.opponent.username).toBe('bob');
    expect(game.result).toBe('win');
  });

  it('flips user/opponent when the user played black', async () => {
    mockFetchSequence(
      jsonResponse({
        archives: ['https://api.chess.com/pub/player/bob/games/2026/05'],
      }),
      jsonResponse({ games: [makeRawGame()] }),
    );

    const [game] = await fetchLastGames('bob');

    expect(game.userColor).toBe('black');
    expect(game.user.username).toBe('bob');
    expect(game.opponent.username).toBe('alice');
    // black got checkmated → "loss" in our perspective
    expect(game.result).toBe('loss');
  });

  it('parses increment from a "300+5" time control', async () => {
    mockFetchSequence(
      jsonResponse({
        archives: ['https://api.chess.com/pub/player/alice/games/2026/05'],
      }),
      jsonResponse({ games: [makeRawGame({ time_control: '300+5' })] }),
    );

    const [game] = await fetchLastGames('alice');

    expect(game.increment).toBe(5);
    expect(game.clockSnapshots[0]).toEqual({
      whiteSeconds: 300,
      blackSeconds: 300,
    });
  });

  it('extracts a human-readable opening from the eco URL', async () => {
    mockFetchSequence(
      jsonResponse({
        archives: ['https://api.chess.com/pub/player/alice/games/2026/05'],
      }),
      jsonResponse({
        games: [
          makeRawGame({
            eco: 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation',
          }),
        ],
      }),
    );

    const [game] = await fetchLastGames('alice');

    expect(game.opening).toBe('Sicilian Defense Najdorf Variation');
  });

  it('leaves opening undefined when eco is missing', async () => {
    mockFetchSequence(
      jsonResponse({
        archives: ['https://api.chess.com/pub/player/alice/games/2026/05'],
      }),
      jsonResponse({ games: [makeRawGame({ eco: undefined })] }),
    );

    const [game] = await fetchLastGames('alice');

    expect(game.opening).toBeUndefined();
  });
});
