import { render, screen } from '@testing-library/react';
import LeaderboardPage from '@/app/[locale]/leaderboard/page';

const redirect = jest.fn();
jest.mock('@/i18n/navigation', () => ({
  redirect: (args: unknown) => redirect(args),
}));
jest.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));
const getAuthedUser = jest.fn();
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: () => getAuthedUser(),
}));
const getLeaderboard = jest.fn();
jest.mock('@/lib/leaderboard/getLeaderboard', () => ({
  getLeaderboard: () => getLeaderboard(),
}));
jest.mock('@/app/components/PageLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
jest.mock('@/app/components/Leaderboard', () => ({
  __esModule: true,
  default: () => <div>leaderboard-table</div>,
}));

describe('leaderboard page', () => {
  beforeEach(() => {
    redirect.mockReset();
    getLeaderboard.mockReset().mockResolvedValue([]);
  });

  it('sends guests to /login without loading the board', async () => {
    getAuthedUser.mockResolvedValue(null);
    await LeaderboardPage();
    expect(redirect).toHaveBeenCalledWith({ href: '/login', locale: 'en' });
    expect(getLeaderboard).not.toHaveBeenCalled();
  });

  it('shows the board to signed-in users', async () => {
    getAuthedUser.mockResolvedValue({ id: 'u1', role: 'user' });
    render(await LeaderboardPage());
    expect(screen.getByText('leaderboard-table')).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });
});
