import {
  consumeLinkToken,
  createLinkToken,
  findLinkByChat,
  unlinkChat,
} from '@/lib/telegram/link';

type Call = { table: string; op: string; args: unknown[] };
let calls: Call[] = [];
let tokenRows: { user_id: string }[] = [];
let linkRow: { user_id: string } | null = null;
let profileRow: {
  nickname: string;
  role: string;
  preferred_locale: string | null;
} | null = null;

// Minimal chainable stand-in for the Supabase query builder; records every
// call per table. Awaiting a builder resolves to the data the table "holds".
function from(table: string) {
  let op = '';
  const rec = (name: string, args: unknown[]) => {
    calls.push({ table, op: name, args });
  };
  const result = () => {
    if (table === 'telegram_link_tokens' && op === 'delete-returning')
      return { data: tokenRows, error: null };
    return { data: null, error: null };
  };
  const builder: Record<string, unknown> = {
    insert: (...a: unknown[]) => (rec('insert', a), builder),
    upsert: (...a: unknown[]) => (rec('upsert', a), builder),
    delete: (...a: unknown[]) => ((op = 'delete'), rec('delete', a), builder),
    select: (...a: unknown[]) => {
      if (op === 'delete') op = 'delete-returning';
      rec('select', a);
      return builder;
    },
    eq: (...a: unknown[]) => (rec('eq', a), builder),
    gt: (...a: unknown[]) => (rec('gt', a), builder),
    maybeSingle: async () => {
      if (table === 'telegram_links') return { data: linkRow, error: null };
      return { data: profileRow, error: null };
    },
    then: (resolve: (v: unknown) => void) => resolve(result()),
  };
  return builder;
}

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from }),
}));

const on = (table: string, op: string) =>
  calls.filter((c) => c.table === table && c.op === op);

beforeEach(() => {
  calls = [];
  tokenRows = [];
  linkRow = null;
  profileRow = null;
});

describe('createLinkToken', () => {
  beforeEach(() =>
    jest.useFakeTimers().setSystemTime(new Date('2026-10-30T12:00:00Z')),
  );
  afterEach(() => jest.useRealTimers());

  it('replaces old tokens and inserts one expiring in 15 minutes', async () => {
    const token = await createLinkToken('u1');
    expect(token).toMatch(/^[A-Za-z0-9_-]{20,64}$/);
    expect(on('telegram_link_tokens', 'delete')).toHaveLength(1);
    expect(on('telegram_link_tokens', 'eq')[0].args).toEqual(['user_id', 'u1']);
    expect(on('telegram_link_tokens', 'insert')[0].args[0]).toEqual({
      token,
      user_id: 'u1',
      expires_at: '2026-10-30T12:15:00.000Z',
    });
  });
});

describe('consumeLinkToken', () => {
  it('returns null for an unknown or expired token and writes no link', async () => {
    tokenRows = [];
    expect(await consumeLinkToken('nope', 42)).toBeNull();
    expect(on('telegram_links', 'upsert')).toHaveLength(0);
    expect(on('telegram_links', 'delete')).toHaveLength(0);
    expect(on('telegram_link_tokens', 'gt')[0].args[0]).toBe('expires_at');
  });

  it('links the chat for a valid token', async () => {
    tokenRows = [{ user_id: 'u1' }];
    profileRow = { nickname: 'Mark', role: 'admin', preferred_locale: 'ru' };
    const res = await consumeLinkToken('tok', 42);
    expect(res).toEqual({ nickname: 'Mark', isAdmin: true, locale: 'ru' });
    expect(on('telegram_link_tokens', 'delete')).toHaveLength(1);
    expect(on('telegram_links', 'delete')).toHaveLength(1);
    expect(on('telegram_links', 'eq')[0].args).toEqual(['chat_id', 42]);
    expect(on('telegram_links', 'upsert')[0].args).toEqual([
      { user_id: 'u1', chat_id: 42 },
      { onConflict: 'user_id' },
    ]);
  });

  it('a second consume of the same token returns null and keeps the link', async () => {
    tokenRows = [{ user_id: 'u1' }];
    profileRow = { nickname: 'Mark', role: 'user', preferred_locale: null };
    expect(await consumeLinkToken('tok', 42)).toEqual({
      nickname: 'Mark',
      isAdmin: false,
      locale: 'en',
    });
    calls = [];
    tokenRows = [];
    expect(await consumeLinkToken('tok', 43)).toBeNull();
    expect(on('telegram_links', 'delete')).toHaveLength(0);
    expect(on('telegram_links', 'upsert')).toHaveLength(0);
  });
});

describe('findLinkByChat', () => {
  it('returns null when the chat is not linked', async () => {
    expect(await findLinkByChat(1)).toBeNull();
  });

  it('joins the profile', async () => {
    linkRow = { user_id: 'u1' };
    profileRow = { nickname: 'M', role: 'user', preferred_locale: 'ru' };
    expect(await findLinkByChat(1)).toEqual({
      userId: 'u1',
      isAdmin: false,
      locale: 'ru',
    });
  });
});

describe('unlinkChat', () => {
  it('deletes by chat_id', async () => {
    await unlinkChat(7);
    expect(on('telegram_links', 'delete')).toHaveLength(1);
    expect(on('telegram_links', 'eq')[0].args).toEqual(['chat_id', 7]);
  });
});
