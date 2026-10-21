import { buildReplay } from '@/lib/chess/replay';
import {
  createCoachingRequest,
  respondToRequest,
} from '@/lib/coaching/actions';

const BLACK_TO_MOVE =
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 3 3';

const insert = jest.fn();
let requestRow: { fen: string } | null = null;
let existingResponse: { id: string } | null = null;

// Minimal chainable stand-in for the Supabase query builder: only the calls
// the coaching actions make.
function from(table: string) {
  const builder = {
    insert: (row: unknown) => {
      insert(table, row);
      return builder;
    },
    select: () => builder,
    eq: () => builder,
    single: async () =>
      table === 'coaching_requests' && !insertedRow()
        ? { data: requestRow, error: requestRow ? null : { code: 'PGRST116' } }
        : { data: { id: 'new-id' }, error: null },
    maybeSingle: async () => ({ data: existingResponse, error: null }),
    then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
  };
  return builder;
}

function insertedRow() {
  return insert.mock.calls.length > 0;
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from,
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  }),
}));

const getAuthedUser = jest.fn();
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: () => getAuthedUser(),
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

function askForm(extra: Record<string, string> = {}) {
  const fd = new FormData();
  Object.entries({
    game_url: 'https://lichess.org/abc',
    fen: BLACK_TO_MOVE,
    move_index: '5',
    move_san: '3. Nf3',
    body: 'What now?',
    ...extra,
  }).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

function replyForm(extra: Record<string, string> = {}) {
  const fd = new FormData();
  Object.entries({ request_id: 'r1', body: 'Play Nf6', ...extra }).forEach(
    ([k, v]) => fd.append(k, v),
  );
  return fd;
}

const RUY_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6';
// Position before half-move 5 (3. Bb5).
const RUY_KEY_FEN = buildReplay(RUY_PGN, BLACK_TO_MOVE).positions[4];

function insertedPgn(): string | null {
  return (insert.mock.calls[0][1] as { pgn: string | null }).pgn;
}

// 4000 characters once line breaks count as one, 4200 as sent by a browser.
const LONG_CRLF_BODY = ('x'.repeat(19) + '\r\n').repeat(200);

function insertedBody(): string {
  return (insert.mock.calls[0][1] as { body: string }).body;
}

beforeEach(() => {
  insert.mockClear();
  requestRow = { fen: BLACK_TO_MOVE };
  existingResponse = null;
  getAuthedUser.mockResolvedValue({ id: 'c1', role: 'admin' });
});

describe('createCoachingRequest', () => {
  it('stores a valid variation', async () => {
    const result = await createCoachingRequest(
      undefined,
      askForm({ variation: '["Nf6"]' }),
    );
    expect(result).toEqual({ success: true, requestId: 'new-id' });
    expect(insert).toHaveBeenCalledWith(
      'coaching_requests',
      expect.objectContaining({ variation: ['Nf6'] }),
    );
  });

  it('stores null without a variation', async () => {
    await createCoachingRequest(undefined, askForm());
    expect(insert).toHaveBeenCalledWith(
      'coaching_requests',
      expect.objectContaining({ variation: null }),
    );
  });

  it('stores the pgn when it matches the asked position', async () => {
    const result = await createCoachingRequest(
      undefined,
      askForm({ fen: RUY_KEY_FEN, move_index: '5', pgn: RUY_PGN }),
    );
    expect(result).toEqual({ success: true, requestId: 'new-id' });
    expect(insertedPgn()).toBe(RUY_PGN);
  });

  it('stores null pgn when it does not match', async () => {
    const result = await createCoachingRequest(
      undefined,
      askForm({ pgn: RUY_PGN }),
    );
    expect(result).toEqual({ success: true, requestId: 'new-id' });
    expect(insertedPgn()).toBeNull();
  });

  it('stores null pgn without the field', async () => {
    await createCoachingRequest(undefined, askForm());
    expect(insertedPgn()).toBeNull();
  });

  it('stores null pgn when it is too long', async () => {
    const padded = `{${'x'.repeat(100001)}} ${RUY_PGN}`;
    const result = await createCoachingRequest(
      undefined,
      askForm({ fen: RUY_KEY_FEN, move_index: '5', pgn: padded }),
    );
    expect(result).toEqual({ success: true, requestId: 'new-id' });
    expect(insertedPgn()).toBeNull();
  });

  it('accepts a 4000-character question sent with CRLF line breaks', async () => {
    const result = await createCoachingRequest(
      undefined,
      askForm({ body: LONG_CRLF_BODY }),
    );
    expect(result).toEqual({ success: true, requestId: 'new-id' });
    expect(insertedBody()).not.toContain('\r');
  });

  it.each(['nope', '[]', '["Ke8xe1"]'])(
    'rejects variation %s',
    async (variation) => {
      const result = await createCoachingRequest(
        undefined,
        askForm({ variation }),
      );
      expect(result).toEqual({ error: 'coaching.errors.invalidVariation' });
      expect(insert).not.toHaveBeenCalled();
    },
  );
});

describe('respondToRequest', () => {
  it("stores a variation legal from the request's fen", async () => {
    const result = await respondToRequest(
      undefined,
      replyForm({ variation: '["Nf6","Nc3"]' }),
    );
    expect(result).toEqual({ success: true });
    expect(insert).toHaveBeenCalledWith('coaching_responses', {
      request_id: 'r1',
      body: 'Play Nf6',
      variation: ['Nf6', 'Nc3'],
    });
  });

  it("rejects a variation illegal from the request's fen", async () => {
    const result = await respondToRequest(
      undefined,
      replyForm({ variation: '["e4"]' }),
    );
    expect(result).toEqual({ error: 'coaching.errors.invalidVariation' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('accepts a 4000-character reply sent with CRLF line breaks', async () => {
    const result = await respondToRequest(
      undefined,
      replyForm({ body: LONG_CRLF_BODY }),
    );
    expect(result).toEqual({ success: true });
    expect(insertedBody()).not.toContain('\r');
  });

  it('reports a missing request', async () => {
    requestRow = null;
    const result = await respondToRequest(undefined, replyForm());
    expect(result).toEqual({ error: 'coaching.errors.missingFields' });
    expect(insert).not.toHaveBeenCalled();
  });
});
