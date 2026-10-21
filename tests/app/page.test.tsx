import { render, screen, within } from '@testing-library/react';
import Home from '@/app/[locale]/page';

jest.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

describe('home page', () => {
  it('shows the brand and the project idea', async () => {
    render(await Home());
    expect(
      screen.getByRole('heading', { level: 1, name: 'Chess Fundamentals' }),
    ).toBeInTheDocument();
    expect(screen.getByText('home.tagline')).toBeInTheDocument();
    expect(screen.getByText('home.idea')).toBeInTheDocument();
  });

  it('primary CTA leads to key positions, secondary to lessons', async () => {
    render(await Home());
    expect(
      screen.getByRole('link', { name: 'home.ctaPrimary' }),
    ).toHaveAttribute('href', '/think-time');
    expect(
      screen.getByRole('link', { name: 'home.ctaSecondary' }),
    ).toHaveAttribute('href', '/lessons');
  });

  it('secondary CTA keeps its visible outline border', async () => {
    render(await Home());
    const secondary = screen.getByRole('link', { name: 'home.ctaSecondary' });
    expect(secondary).toHaveClass('border-border');
    expect(secondary).not.toHaveClass('border-transparent');
  });

  it('explains how it works in three steps', async () => {
    render(await Home());
    expect(
      screen.getByRole('heading', { name: 'home.howItWorks.title' }),
    ).toBeInTheDocument();
    const steps = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent('home.howItWorks.find.title');
    expect(steps[1]).toHaveTextContent('home.howItWorks.think.title');
    expect(steps[2]).toHaveTextContent('home.howItWorks.discuss.title');
  });

  it('links every feature card', async () => {
    render(await Home());
    const cards = {
      keyPositions: '/think-time',
      games: '/games',
      coaching: '/coaching',
      lessons: '/lessons',
    };
    for (const [key, href] of Object.entries(cards)) {
      expect(
        screen.getByRole('link', {
          name: new RegExp(`home\\.features\\.${key}\\.title`),
        }),
      ).toHaveAttribute('href', href);
    }
  });

  it('announces discussion with other players as coming soon', async () => {
    render(await Home());
    expect(
      screen.getByRole('heading', { name: 'home.future.title' }),
    ).toBeInTheDocument();
    expect(screen.getByText('home.future.description')).toBeInTheDocument();
  });
});
