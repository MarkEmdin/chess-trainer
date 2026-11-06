import { render, screen } from '@testing-library/react';
import Footer from '@/app/components/Footer';

jest.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

jest.mock('@/app/components/FeedbackDialog', () => ({
  __esModule: true,
  default: () => <button>feedback</button>,
}));

describe('Footer', () => {
  it('links to the tutorial', async () => {
    render(await Footer());
    expect(
      screen.getByRole('link', { name: 'footer.tutorial' }),
    ).toHaveAttribute('href', '/tutorial');
  });

  it('offers to send feedback', async () => {
    render(await Footer());
    expect(screen.getByRole('button', { name: 'feedback' })).toBeInTheDocument();
  });

  it('links to the about page', async () => {
    render(await Footer());
    expect(screen.getByRole('link', { name: 'footer.about' })).toHaveAttribute(
      'href',
      '/about',
    );
  });

  it('shows the brand with the current year', async () => {
    render(await Footer());
    expect(
      screen.getByText(`© ${new Date().getFullYear()} Chess Fundamentals`),
    ).toBeInTheDocument();
  });
});
