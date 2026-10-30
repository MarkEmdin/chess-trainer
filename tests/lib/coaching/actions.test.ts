import { buildReplay } from '@/lib/chess/replay';
import { revalidatePath } from 'next/cache';
import {
  createCoachingRequest,
  markResponseSeen,
  respondToRequest,
} from '@/lib/coaching/actions';

const BLACK_TO_MOVE =
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 3 3';

const insert = jest.fn();
const rpc = jest.fn();
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
    rpc: (...args: unknown[]) => rpc(...args),
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
  }),
}));

const getAuthedUser = jest.fn();
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: () => getAuthedUser(),
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

// Run `after` callbacks immediately; a rejecting callback must not escape.
jest.mock('next/server', () => ({
  after: (fn: () => unknown) => {
    try {
      void Promise.resolve(fn()).catch(() => {});
    } catch {
      // swallowed like Next does
    }
  },
}));
jest.mock('next/headers', () => ({
  headers: async () => ({ get: () => 'https://site.test' }),
}));

const notifyAdminsOfQuestion = jest.fn();
const notifyStudentOfAnswer = jest.fn();
jest.mock('@/lib/telegram/notify', () => ({
  notifyAdminsOfQuestion: (...a: unknown[]) => notifyAdminsOfQuestion(...a),
  notifyStudentOfAnswer: (...a: unknown[]) => notifyStudentOfAnswer(...a),
}));

const shouldOfferTelegram = jest.fn();
jest.mock('@/lib/telegram/prompt', () => ({
  shouldOfferTelegram: (...a: unknown[]) => shouldOfferTelegram(...a),
}));

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

// 8000 characters once line breaks count as one, 8400 as sent by a browser.
const LONG_CRLF_BODY = ('x'.repeat(19) + '\r\n').repeat(400);

function insertedBody(): string {
  return (insert.mock.calls[0][1] as { body: string }).body;
}

beforeEach(() => {
  insert.mockClear();
  notifyAdminsOfQuestion.mockReset();
  notifyStudentOfAnswer.mockReset();
  requestRow = { fen: BLACK_TO_MOVE };
  existingResponse = null;
  getAuthedUser.mockResolvedValue({ id: 'c1', role: 'admin' });
  shouldOfferTelegram.mockReset().mockResolvedValue(true);
});

describe('createCoachingRequest', () => {
  it('returns whether to offer Telegram for the asking user', async () => {
    shouldOfferTelegram.mockResolvedValue(false);
    const result = await createCoachingRequest(undefined, askForm());
    expect(result).toEqual({
      success: true,
      requestId: 'new-id',
      telegramPrompt: false,
    });
    expect(shouldOfferTelegram).toHaveBeenCalledWith('u1');
  });

  it('stores a valid variation', async () => {
    const result = await createCoachingRequest(
      undefined,
      askForm({ variation: '["Nf6"]' }),
    );
    expect(result).toEqual({
      success: true,
      requestId: 'new-id',
      telegramPrompt: true,
    });
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
    expect(result).toEqual({
      success: true,
      requestId: 'new-id',
      telegramPrompt: true,
    });
    expect(insertedPgn()).toBe(RUY_PGN);
  });

  it('stores null pgn when it does not match', async () => {
    const result = await createCoachingRequest(
      undefined,
      askForm({ pgn: RUY_PGN }),
    );
    expect(result).toEqual({
      success: true,
      requestId: 'new-id',
      telegramPrompt: true,
    });
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
    expect(result).toEqual({
      success: true,
      requestId: 'new-id',
      telegramPrompt: true,
    });
    expect(insertedPgn()).toBeNull();
  });

  it('accepts an 8000-character question sent with CRLF line breaks', async () => {
    const result = await createCoachingRequest(
      undefined,
      askForm({ body: LONG_CRLF_BODY }),
    );
    expect(result).toEqual({
      success: true,
      requestId: 'new-id',
      telegramPrompt: true,
    });
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
      content: null,
    });
  });

  it('refreshes the layout so the header bell recounts', async () => {
    await respondToRequest(undefined, replyForm());
    expect(revalidatePath).toHaveBeenCalledWith('/[locale]', 'layout');
  });

  it("rejects a variation illegal from the request's fen", async () => {
    const result = await respondToRequest(
      undefined,
      replyForm({ variation: '["e4"]' }),
    );
    expect(result).toEqual({ error: 'coaching.errors.invalidVariation' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('accepts an 8000-character reply sent with CRLF line breaks', async () => {
    const result = await respondToRequest(
      undefined,
      replyForm({ body: LONG_CRLF_BODY }),
    );
    expect(result).toEqual({ success: true });
    expect(insertedBody()).not.toContain('\r');
  });

  it.each([
    ['signed out', null],
    ['a regular user', { id: 'u1', role: 'user' }],
  ])('refuses a reply from %s', async (_label, user) => {
    getAuthedUser.mockResolvedValue(user);
    const result = await respondToRequest(undefined, replyForm());
    expect(result).toEqual({ error: 'coaching.errors.notAdmin' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('reports a missing request', async () => {
    requestRow = null;
    const result = await respondToRequest(undefined, replyForm());
    expect(result).toEqual({ error: 'coaching.errors.missingFields' });
    expect(insert).not.toHaveBeenCalled();
  });
});

// Inline-editor messages (spec 011): moves live in `content`, and `body` is
// rebuilt from it on the server.
function content(segments: unknown[], lines: Record<string, string[]>) {
  return JSON.stringify({ v: 1, segments, lines, drawings: {} });
}

const D6_CONTENT = content(
  [
    { t: 'text', text: 'Хотел ' },
    { t: 'moves', line: 'l1', from: 0, to: 1 },
  ],
  { l1: ['d6'] },
);

describe('inline-move content', () => {
  it('stores content and rebuilds the body from it', async () => {
    const result = await createCoachingRequest(
      undefined,
      askForm({ body: 'ignored', content: D6_CONTENT }),
    );
    expect(result).toEqual({
      success: true,
      requestId: 'new-id',
      telegramPrompt: true,
    });
    expect(insert).toHaveBeenCalledWith(
      'coaching_requests',
      expect.objectContaining({
        body: 'Хотел 3… d6',
        variation: null,
        content: JSON.parse(D6_CONTENT),
      }),
    );
  });

  it('rejects content with an illegal line', async () => {
    const result = await createCoachingRequest(
      undefined,
      askForm({
        content: content([{ t: 'moves', line: 'l1', from: 0, to: 1 }], {
          l1: ['c3'],
        }),
      }),
    );
    expect(result).toEqual({ error: 'coaching.errors.invalidVariation' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses content that is only whitespace', async () => {
    const result = await createCoachingRequest(
      undefined,
      askForm({ body: '', content: content([{ t: 'text', text: '   ' }], {}) }),
    );
    expect(result).toEqual({ error: 'coaching.errors.missingFields' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('accepts moves without any text', async () => {
    const result = await createCoachingRequest(
      undefined,
      askForm({
        body: '',
        content: content([{ t: 'moves', line: 'l1', from: 0, to: 1 }], {
          l1: ['d6'],
        }),
      }),
    );
    expect(result).toEqual({
      success: true,
      requestId: 'new-id',
      telegramPrompt: true,
    });
    expect(insertedBody()).toBe('3… d6');
  });

  it('rejects content whose rebuilt body is too long', async () => {
    const result = await createCoachingRequest(
      undefined,
      askForm({
        content: content([{ t: 'text', text: 'x'.repeat(8001) }], {}),
      }),
    );
    expect(result).toEqual({ error: 'coaching.errors.bodyTooLong' });
  });

  it("validates a reply against the request's fen, not the form's", async () => {
    // c3 is a white move: illegal from the request's black-to-move fen even
    // though the form claims a white-to-move position.
    const result = await respondToRequest(
      undefined,
      replyForm({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        content: content([{ t: 'moves', line: 'l1', from: 0, to: 1 }], {
          l1: ['c3'],
        }),
      }),
    );
    expect(result).toEqual({ error: 'coaching.errors.invalidVariation' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('stores reply content with the rebuilt body', async () => {
    const result = await respondToRequest(
      undefined,
      replyForm({ content: D6_CONTENT }),
    );
    expect(result).toEqual({ success: true });
    expect(insert).toHaveBeenCalledWith('coaching_responses', {
      request_id: 'r1',
      body: 'Хотел 3… d6',
      variation: null,
      content: JSON.parse(D6_CONTENT),
    });
  });
});

describe('telegram notifications', () => {
  it('notifies admins after a question is stored', async () => {
    await createCoachingRequest(undefined, askForm());
    expect(notifyAdminsOfQuestion).toHaveBeenCalledWith(
      'new-id',
      'https://site.test',
    );
  });

  it('notifies the student after an answer is stored', async () => {
    await respondToRequest(undefined, replyForm());
    expect(notifyStudentOfAnswer).toHaveBeenCalledWith(
      'r1',
      'https://site.test',
    );
  });

  it('does not notify on a validation error', async () => {
    await createCoachingRequest(undefined, askForm({ variation: 'nope' }));
    await respondToRequest(undefined, replyForm({ variation: '["e4"]' }));
    expect(notifyAdminsOfQuestion).not.toHaveBeenCalled();
    expect(notifyStudentOfAnswer).not.toHaveBeenCalled();
  });

  it('still succeeds when a notification rejects', async () => {
    notifyAdminsOfQuestion.mockRejectedValue(new Error('boom'));
    notifyStudentOfAnswer.mockRejectedValue(new Error('boom'));
    expect(await createCoachingRequest(undefined, askForm())).toEqual({
      success: true,
      requestId: 'new-id',
      telegramPrompt: true,
    });
    expect(await respondToRequest(undefined, replyForm())).toEqual({
      success: true,
    });
  });
});

describe('markResponseSeen', () => {
  beforeEach(() => {
    rpc.mockReset();
    jest.mocked(revalidatePath).mockClear();
  });

  it('marks the answer seen and refreshes the header', async () => {
    rpc.mockResolvedValue({ error: null });
    await markResponseSeen('r1');
    expect(rpc).toHaveBeenCalledWith('mark_coaching_response_seen', {
      p_request_id: 'r1',
    });
    expect(revalidatePath).toHaveBeenCalledWith('/[locale]', 'layout');
  });

  it('resolves quietly when the RPC reports an error', async () => {
    rpc.mockResolvedValue({ error: { message: 'boom' } });
    await expect(markResponseSeen('r1')).resolves.toBeUndefined();
  });

  it('resolves quietly when the RPC call throws', async () => {
    rpc.mockRejectedValue(new Error('offline'));
    await expect(markResponseSeen('r1')).resolves.toBeUndefined();
  });
});
