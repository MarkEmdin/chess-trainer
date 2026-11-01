import { render, screen } from '@testing-library/react';
import LessonsPage from '@/app/[locale]/lessons/page';

jest.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

describe('lessons page', () => {
  it('lists only theory and world champions', async () => {
    render(await LessonsPage());
    expect(
      screen.getAllByRole('link').map((a) => a.getAttribute('href')),
    ).toEqual(['/lessons/theory', '/lessons/world-champions']);
  });
});
