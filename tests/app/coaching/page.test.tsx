import { render, screen } from '@testing-library/react';
import CoachingPage from '@/app/[locale]/coaching/page';

const redirect = jest.fn(() => {
  // next-intl's redirect throws to stop rendering, like Next's own.
  throw new Error('NEXT_REDIRECT');
});

jest.mock('@/i18n/navigation', () => ({
  redirect: (...args: unknown[]) => redirect(...(args as [])),
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations:
    async (namespace: string) =>
    (key: string, values?: Record<string, unknown>) =>
      values
        ? `${namespace}.${key}(${Object.values(values).join(',')})`
        : `${namespace}.${key}`,
}));

const getAuthedUser = jest.fn();
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: () => getAuthedUser(),
}));

jest.mock('@/app/components/PageLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));

jest.mock('@/app/components/CoachingThreadCard', () => ({
  __esModule: true,
  default: ({ thread }: { thread: { id: string } }) => (
    <div data-testid="card">{thread.id}</div>
  ),
}));

const reply = {
  body: 'ok',
  created_at: '2026-10-21T12:00:00Z',
  variation: null,
};
let rows: { id: string; coaching_responses: (typeof reply)[] }[] = [];
const eq = jest.fn();
const select = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => {
      const builder = {
        select: (columns: string) => {
          select(columns);
          return builder;
        },
        eq: (column: string, value: string) => {
          eq(column, value);
          return builder;
        },
        order: async () => ({ data: rows }),
      };
      return builder;
    },
  }),
}));

const render$ = async (tab?: string) =>
  render(
    await CoachingPage({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve(tab ? { tab } : {}),
    }),
  );

beforeEach(() => {
  redirect.mockClear();
  eq.mockClear();
  select.mockClear();
  getAuthedUser.mockResolvedValue({ id: 'u1', role: 'user' });
  rows = [
    { id: 'wait-1', coaching_responses: [] },
    { id: 'done-1', coaching_responses: [reply] },
    { id: 'wait-2', coaching_responses: [] },
  ];
});

describe('coaching page', () => {
  it('redirects signed-out visitors to login', async () => {
    getAuthedUser.mockResolvedValue(null);
    await expect(render$()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({ href: '/login', locale: 'en' });
  });

  it('shows questions awaiting a reply by default, with counts', async () => {
    await render$();
    expect(screen.getAllByTestId('card').map((c) => c.textContent)).toEqual([
      'wait-1',
      'wait-2',
    ]);
    expect(
      screen.getByRole('tab', { name: 'coachingPage.tabs.waiting(2)' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('tab', { name: 'coachingPage.tabs.answered(1)' }),
    ).toHaveAttribute('href', '/coaching?tab=answered');
  });

  it('shows answered questions on the answered tab', async () => {
    await render$('answered');
    expect(screen.getAllByTestId('card').map((c) => c.textContent)).toEqual([
      'done-1',
    ]);
  });

  it('shows the empty tab message when a tab has nothing', async () => {
    rows = [{ id: 'done-1', coaching_responses: [reply] }];
    await render$();
    expect(screen.getByText('coachingPage.emptyWaiting')).toBeInTheDocument();
  });

  it('shows the old empty message without tabs when nothing was asked', async () => {
    rows = [];
    await render$();
    expect(screen.getByText('coachingPage.empty')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('lists only the signed-in user’s own questions', async () => {
    await render$();
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(select.mock.calls[0][0]).toMatch(/response_seen_at/);
  });

  it('lists only an admin’s own questions too', async () => {
    getAuthedUser.mockResolvedValue({ id: 'a1', role: 'admin' });
    await render$();
    expect(eq).toHaveBeenCalledWith('user_id', 'a1');
  });
});
