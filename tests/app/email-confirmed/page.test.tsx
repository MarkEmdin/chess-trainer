import { render, screen } from '@testing-library/react';
import EmailConfirmedPage from '@/app/[locale]/email-confirmed/page';
import { getAuthedUser } from '@/lib/auth/getUser';
import { redirect } from '@/i18n/navigation';

jest.mock('@/lib/auth/getUser', () => ({ getAuthedUser: jest.fn() }));

jest.mock('@/i18n/navigation', () => ({
  redirect: jest.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

const user = {
  id: 'u1',
  email: 'a@b.c',
  nickname: 'alice',
  role: 'user' as const,
  preferredLocale: 'en',
};

describe('email-confirmed page', () => {
  beforeEach(() => jest.mocked(redirect).mockClear());

  it('welcomes a confirmed user and links into the app', async () => {
    jest.mocked(getAuthedUser).mockResolvedValue(user);
    render(await EmailConfirmedPage());
    expect(
      screen.getByRole('heading', { name: 'auth.emailConfirmed.title' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'auth.emailConfirmed.cta' }),
    ).toHaveAttribute('href', '/lessons');
  });

  it('sends a logged-out visitor to login', async () => {
    jest.mocked(getAuthedUser).mockResolvedValue(null);
    await expect(EmailConfirmedPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({ href: '/login', locale: 'en' });
  });

  it("switches to the user's saved language", async () => {
    jest
      .mocked(getAuthedUser)
      .mockResolvedValue({ ...user, preferredLocale: 'ru' });
    await expect(EmailConfirmedPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({
      href: '/email-confirmed',
      locale: 'ru',
    });
  });
});
