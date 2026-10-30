import {
  notifyAdminsOfQuestion,
  notifyStudentOfAnswer,
  unansweredList,
} from '@/lib/telegram/notify';

type Row = Record<string, unknown>;
let tables: Record<string, Row[]> = {};
let dbError: Error | null = null;

// In-memory stand-in for the Supabase query builder: honours eq/neq/in,
// order and maybeSingle; awaiting resolves to the filtered rows.
function from(table: string) {
  if (dbError) throw dbError;
  let rows = [...(tables[table] ?? [])];
  const builder = {
    select: () => builder,
    eq: (k: string, v: unknown) => {
      rows = rows.filter((r) => r[k] === v);
      return builder;
    },
    neq: (k: string, v: unknown) => {
      rows = rows.filter((r) => r[k] !== v);
      return builder;
    },
    in: (k: string, vs: unknown[]) => {
      rows = rows.filter((r) => vs.includes(r[k]));
      return builder;
    },
    order: (k: string, o: { ascending: boolean }) => {
      rows.sort(
        (a, b) => (String(a[k]) < String(b[k]) ? -1 : 1) * (o.ascending ? 1 : -1),
      );
      return builder;
    },
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    then: (resolve: (v: unknown) => void) =>
      resolve({ data: rows, error: null }),
  };
  return builder;
}

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from }),
}));

const sendMessage = jest.fn();
jest.mock('@/lib/telegram/api', () => ({
  ...jest.requireActual('@/lib/telegram/api'),
  sendMessage: (...a: unknown[]) => sendMessage(...a),
}));

const unlinkChat = jest.fn();
jest.mock('@/lib/telegram/link', () => ({
  unlinkChat: (...a: unknown[]) => unlinkChat(...a),
}));

const telegramConfig = jest.fn();
jest.mock('@/lib/telegram/config', () => ({
  telegramConfig: () => telegramConfig(),
}));

const ORIGIN = 'https://site.test';

beforeEach(() => {
  sendMessage.mockReset().mockResolvedValue('ok');
  unlinkChat.mockReset();
  telegramConfig.mockReturnValue({ token: 't', username: 'u', secret: 's' });
  dbError = null;
  tables = {
    coaching_requests: [
      {
        id: 'q1',
        user_id: 'asker',
        move_san: '3. Nf3',
        body: 'What now?',
        created_at: '2026-10-01T00:00:00Z',
        coaching_responses: [],
      },
    ],
    user_profiles: [
      { id: 'asker', nickname: 'Asker', role: 'admin', preferred_locale: 'en' },
      { id: 'a-ru', nickname: 'A', role: 'admin', preferred_locale: 'ru' },
      { id: 'demoted', nickname: 'D', role: 'user', preferred_locale: 'en' },
      { id: 'nolink', nickname: 'N', role: 'admin', preferred_locale: 'en' },
    ],
    telegram_links: [
      { user_id: 'asker', chat_id: 1 },
      { user_id: 'a-ru', chat_id: 2 },
      { user_id: 'demoted', chat_id: 3 },
    ],
  };
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('notifyAdminsOfQuestion', () => {
  it('sends to every linked admin except the asker, in each admin locale, with the admin?request button', async () => {
    await notifyAdminsOfQuestion('q1', ORIGIN);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, msg] = sendMessage.mock.calls[0];
    expect(chatId).toBe(2);
    expect(msg.buttons[0].url).toBe(`${ORIGIN}/ru/admin?request=q1`);
    expect(msg.text).toContain('Asker');
  });

  it('skips admins without a link and users whose role is not admin', async () => {
    await notifyAdminsOfQuestion('q1', ORIGIN);
    expect(sendMessage.mock.calls.map((c) => c[0])).toEqual([2]);
  });

  it("unlinks the chat when the send is 'blocked'", async () => {
    sendMessage.mockResolvedValue('blocked');
    await notifyAdminsOfQuestion('q1', ORIGIN);
    expect(unlinkChat).toHaveBeenCalledWith(2);
  });

  it('resolves and logs when sendMessage rejects', async () => {
    sendMessage.mockRejectedValue(new Error('boom'));
    await expect(notifyAdminsOfQuestion('q1', ORIGIN)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('resolves and logs when the DB errors', async () => {
    dbError = new Error('db down');
    await expect(notifyAdminsOfQuestion('q1', ORIGIN)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('is a no-op when telegram is not configured', async () => {
    telegramConfig.mockReturnValue(null);
    await notifyAdminsOfQuestion('q1', ORIGIN);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe('notifyStudentOfAnswer', () => {
  it('sends to the linked asker with the coaching?tab=answered button', async () => {
    await notifyStudentOfAnswer('q1', ORIGIN);
    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [chatId, msg] = sendMessage.mock.calls[0];
    expect(chatId).toBe(1);
    expect(msg.buttons[0].url).toBe(`${ORIGIN}/en/coaching?tab=answered`);
  });

  it('does not send when the asker has no link', async () => {
    tables.telegram_links = [];
    await notifyStudentOfAnswer('q1', ORIGIN);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('is a no-op when telegram is not configured', async () => {
    telegramConfig.mockReturnValue(null);
    await notifyStudentOfAnswer('q1', ORIGIN);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('resolves and logs when the DB errors', async () => {
    dbError = new Error('db down');
    await expect(notifyStudentOfAnswer('q1', ORIGIN)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('unansweredList', () => {
  it('returns requests without responses, oldest first, with nicknames', async () => {
    tables.coaching_requests = [
      {
        id: 'new',
        user_id: 'a-ru',
        move_san: '9. h3',
        created_at: '2026-10-03T00:00:00Z',
        coaching_responses: [],
      },
      {
        id: 'done',
        user_id: 'asker',
        move_san: '5. d4',
        created_at: '2026-10-02T00:00:00Z',
        coaching_responses: [{ id: 'r' }],
      },
      {
        id: 'old',
        user_id: 'asker',
        move_san: '3. Nf3',
        created_at: '2026-10-01T00:00:00Z',
        coaching_responses: [],
      },
    ];
    const msg = await unansweredList(
      ORIGIN,
      'en',
      new Date('2026-10-04T00:00:00Z'),
    );
    expect(msg.text.indexOf('Asker')).toBeGreaterThan(-1);
    expect(msg.text.indexOf('Asker')).toBeLessThan(
      msg.text.indexOf('<b>A</b>'),
    );
    expect(msg.text).not.toContain('5. d4');
    expect(msg.buttons?.map((b) => b.url)).toEqual([
      `${ORIGIN}/en/admin?request=old`,
      `${ORIGIN}/en/admin?request=new`,
      `${ORIGIN}/en/admin`,
    ]);
  });
});
