import { render, screen } from '@testing-library/react';
import AdminPage from '@/app/[locale]/admin/page';

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

jest.mock('@/app/components/CoachingAdminCard', () => ({
  __esModule: true,
  default: ({ request }: { request: { id: string } }) => (
    <div data-testid="card">{request.id}</div>
  ),
}));

const rows = [
  {
    id: 'new-1',
    user_id: 'u1',
    created_at: '2026-10-22T10:00:00Z',
    coaching_responses: [],
  },
  {
    id: 'done-1',
    user_id: 'u1',
    created_at: '2026-10-21T10:00:00Z',
    coaching_responses: [
      { body: 'ok', created_at: '2026-10-21T12:00:00Z', variation: null },
    ],
  },
  {
    id: 'new-2',
    user_id: 'u2',
    created_at: '2026-10-20T10:00:00Z',
    coaching_responses: [],
  },
];

// Chainable stand-in: requests come back from .order(), profiles from .in().
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const builder = {
        select: () => builder,
        order: async () => ({ data: rows }),
        in: async () => ({
          data:
            table === 'user_profiles' ? [{ id: 'u1', nickname: 'alice' }] : [],
        }),
      };
      return builder;
    },
  }),
}));

const render$ = async (tab?: string) =>
  render(
    await AdminPage({
      params: Promise.resolve({ locale: 'en' }),
      searchParams: Promise.resolve(tab ? { tab } : {}),
    }),
  );

beforeEach(() => {
  redirect.mockClear();
  getAuthedUser.mockResolvedValue({ id: 'c1', role: 'admin' });
});

describe('admin page', () => {
  it.each([
    ['signed out', null],
    ['a regular user', { id: 'u1', role: 'user' }],
  ])('redirects %s to the home page', async (_label, user) => {
    getAuthedUser.mockResolvedValue(user);
    await expect(render$()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({ href: '/', locale: 'en' });
  });

  it('shows new questions by default, with counts on both tabs', async () => {
    await render$();
    expect(screen.getAllByTestId('card').map((c) => c.textContent)).toEqual([
      'new-1',
      'new-2',
    ]);
    expect(
      screen.getByRole('tab', { name: 'coachingAdmin.tabs.new(2)' }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('tab', { name: 'coachingAdmin.tabs.answered(1)' }),
    ).toHaveAttribute('href', '/admin?tab=answered');
  });

  it('shows answered questions on the answered tab', async () => {
    await render$('answered');
    expect(screen.getAllByTestId('card').map((c) => c.textContent)).toEqual([
      'done-1',
    ]);
    expect(
      screen.getByRole('tab', { name: 'coachingAdmin.tabs.answered(1)' }),
    ).toHaveAttribute('aria-selected', 'true');
  });
});
