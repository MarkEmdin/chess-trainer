import { render, screen } from '@testing-library/react';
import PrivacyPage from '@/app/[locale]/privacy/page';

jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

jest.mock('@/app/components/PageLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));

describe('privacy page', () => {
  it('covers data, use, sharing, browser storage and removal', async () => {
    render(await PrivacyPage());
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      'privacy.sections.data.title',
      'privacy.sections.use.title',
      'privacy.sections.sharing.title',
      'privacy.sections.browser.title',
      'privacy.sections.removal.title',
    ]);
  });

  it('gives an address to write to', async () => {
    render(await PrivacyPage());
    expect(
      screen.getByRole('link', { name: 'chesstrainer.notify@gmail.com' }),
    ).toHaveAttribute('href', 'mailto:chesstrainer.notify@gmail.com');
  });
});
