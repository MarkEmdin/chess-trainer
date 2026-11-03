import { render, screen } from '@testing-library/react';
import BecomeCoachPage from '@/app/[locale]/become-coach/page';

const redirect = jest.fn();
jest.mock('@/i18n/navigation', () => ({
  redirect: (...a: unknown[]) => redirect(...a),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
jest.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
  getFormatter: async () => ({ dateTime: () => '3 Nov 2026' }),
}));

let user: { id: string; role: string } | null = { id: 'u1', role: 'user' };
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: async () => user,
}));

let latest: Record<string, unknown> | null = null;
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const b = {
        select: () => b,
        eq: () => b,
        order: () => b,
        limit: () => b,
        maybeSingle: async () =>
          table === 'coach_applications'
            ? { data: latest }
            : { data: { chesscom_username: 'kid', lichess_username: null } },
      };
      return b;
    },
  }),
}));
jest.mock('@/app/components/PageLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
jest.mock('@/app/components/CoachApplicationForm', () => ({
  __esModule: true,
  default: ({ initial }: { initial: Record<string, string> }) => (
    <div>form {JSON.stringify(initial)}</div>
  ),
}));

beforeEach(() => {
  user = { id: 'u1', role: 'user' };
  latest = null;
  redirect.mockReset();
});

describe('become-coach page', () => {
  it('sends a signed-out visitor to login', async () => {
    user = null;
    await BecomeCoachPage();
    expect(redirect).toHaveBeenCalledWith({ href: '/login', locale: 'en' });
  });

  it('tells a coach they already are one', async () => {
    user = { id: 'c1', role: 'coach' };
    render(await BecomeCoachPage());
    expect(screen.getByText('coaches.apply.alreadyCoach')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/admin');
  });

  it('shows the pending state instead of the form', async () => {
    latest = { status: 'pending', created_at: '2026-11-03T10:00:00Z' };
    render(await BecomeCoachPage());
    expect(screen.getByText('coaches.apply.pending')).toBeInTheDocument();
    expect(screen.queryByText(/^form/)).not.toBeInTheDocument();
  });

  it('prefills the form from the profile handles', async () => {
    render(await BecomeCoachPage());
    expect(screen.getByText(/^form/)).toHaveTextContent(
      '"chesscom_username":"kid"',
    );
  });

  it('after a rejection, says so and prefills the last application', async () => {
    latest = {
      status: 'rejected',
      created_at: '2026-11-01T10:00:00Z',
      first_name: 'Ivan',
      last_name: 'Petrov',
      title: 'IM',
      fide_id: null,
      chesscom_username: 'ivan',
      lichess_username: null,
      about: 'Hi',
    };
    render(await BecomeCoachPage());
    expect(screen.getByText('coaches.apply.rejected')).toBeInTheDocument();
    expect(screen.getByText(/^form/)).toHaveTextContent('"first_name":"Ivan"');
  });
});
