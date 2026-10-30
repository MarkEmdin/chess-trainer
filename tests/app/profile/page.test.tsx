import { render, screen } from '@testing-library/react';
import ProfilePage from '@/app/[locale]/profile/page';

jest.mock('@/i18n/navigation', () => ({ redirect: jest.fn() }));
jest.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: async () => ({ id: 'u1', role: 'user' }),
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => {
      const b = {
        select: () => b,
        eq: () => b,
        single: async () => ({ data: null }),
        maybeSingle: async () => ({ data: { user_id: 'u1' } }),
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
jest.mock('@/app/components/ProfileForm', () => ({
  __esModule: true,
  default: () => <div>profile-form</div>,
}));
jest.mock('@/app/components/TelegramConnect', () => ({
  __esModule: true,
  default: ({ connected }: { connected: boolean }) => (
    <div>telegram-connect {String(connected)}</div>
  ),
}));
const telegramConfig = jest.fn();
jest.mock('@/lib/telegram/config', () => ({
  telegramConfig: () => telegramConfig(),
}));

describe('profile page', () => {
  it('hides the Telegram section when telegramConfig() is null', async () => {
    telegramConfig.mockReturnValue(null);
    render(await ProfilePage());
    expect(screen.getByText('profile-form')).toBeInTheDocument();
    expect(screen.queryByText(/telegram-connect/)).not.toBeInTheDocument();
  });

  it('shows the section with the connected state when configured', async () => {
    telegramConfig.mockReturnValue({ token: 't', username: 'b', secret: 's' });
    render(await ProfilePage());
    expect(screen.getByText('telegram-connect true')).toBeInTheDocument();
  });
});
