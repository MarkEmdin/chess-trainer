import { sendFeedback } from '@/lib/feedback/actions';
import { MAX_FEEDBACK_LENGTH } from '@/lib/feedback/types';

const notify = jest.fn();
jest.mock('@/lib/telegram/notify', () => ({
  notifyAdminsOfFeedback: (...a: unknown[]) => notify(...a),
}));

const getAuthedUser = jest.fn();
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: () => getAuthedUser(),
}));

const rpc = jest.fn();
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc: (...a: unknown[]) => rpc(...a) }),
}));

jest.mock('next/headers', () => ({
  headers: async () =>
    new Map([
      ['user-agent', 'TestBrowser/1.0'],
      ['x-forwarded-for', '203.0.113.7, 10.0.0.1'],
    ]),
}));

jest.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

function form(fields: Record<string, string> = {}) {
  const fd = new FormData();
  const all = {
    kind: 'bug',
    body: 'Board is broken',
    contact: '',
    page: 'https://site.test/ru/games',
    screen: '393×760',
    website: '',
    ...fields,
  };
  Object.entries(all).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

beforeEach(() => {
  notify.mockReset().mockResolvedValue(true);
  getAuthedUser.mockReset().mockResolvedValue(null);
  rpc.mockReset().mockResolvedValue({ data: true, error: null });
});

describe('sendFeedback', () => {
  it('refuses a sender over the hourly limit', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const state = await sendFeedback(undefined, form());
    expect(state).toEqual({ error: 'errors.tooMany' });
    expect(notify).not.toHaveBeenCalled();
  });

  it('counts by a hash of the first address, never the address', async () => {
    await sendFeedback(undefined, form());
    const [name, args] = rpc.mock.calls[0];
    expect(name).toBe('allow_feedback');
    expect(args.p_limit).toBe(5);
    expect(args.p_key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('still delivers when the limit check fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    expect(await sendFeedback(undefined, form())).toEqual({ success: true });
    expect(notify).toHaveBeenCalled();
  });

  it('sends a guest message with its context', async () => {
    const state = await sendFeedback(undefined, form({ contact: '@me' }));
    expect(state).toEqual({ success: true });
    expect(notify).toHaveBeenCalledWith({
      kind: 'bug',
      body: 'Board is broken',
      sender: null,
      contact: '@me',
      page: 'https://site.test/ru/games',
      device: '393×760, TestBrowser/1.0',
    });
  });

  it('names a signed-in sender', async () => {
    getAuthedUser.mockResolvedValue({ nickname: 'Mark', email: 'm@x.test' });
    await sendFeedback(undefined, form());
    expect(notify.mock.calls[0][0].sender).toEqual({
      nickname: 'Mark',
      email: 'm@x.test',
    });
  });

  it.each([
    ['empty', '   ', 'errors.empty'],
    ['too long', 'x'.repeat(MAX_FEEDBACK_LENGTH + 1), 'errors.tooLong'],
  ])('refuses %s text', async (_name, body, error) => {
    expect(await sendFeedback(undefined, form({ body }))).toEqual({ error });
    expect(notify).not.toHaveBeenCalled();
  });

  it('falls back to a bug for an unknown kind', async () => {
    await sendFeedback(undefined, form({ kind: 'nonsense' }));
    expect(notify.mock.calls[0][0].kind).toBe('bug');
  });

  it('caps the fields it does not validate', async () => {
    await sendFeedback(
      undefined,
      form({ contact: 'c'.repeat(500), page: 'p'.repeat(900) }),
    );
    const sent = notify.mock.calls[0][0];
    expect(sent.contact).toHaveLength(100);
    expect(sent.page).toHaveLength(300);
  });

  it('pretends to succeed for a filled hidden field', async () => {
    const state = await sendFeedback(undefined, form({ website: 'spam.test' }));
    expect(state).toEqual({ success: true });
    expect(notify).not.toHaveBeenCalled();
  });

  it('reports a failed delivery', async () => {
    notify.mockResolvedValue(false);
    expect(await sendFeedback(undefined, form())).toEqual({
      error: 'errors.failed',
    });
  });
});
