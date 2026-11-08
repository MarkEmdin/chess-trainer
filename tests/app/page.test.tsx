import { render, screen, within } from '@testing-library/react';
import Home from '@/app/[locale]/page';

const redirect = jest.fn();
jest.mock('@/i18n/navigation', () => ({
  redirect: (args: unknown) => redirect(args),
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

jest.mock('@/app/components/LineDemo', () => ({
  __esModule: true,
  default: ({ header }: { header: React.ReactNode }) => (
    <div data-testid="line-demo">{header}</div>
  ),
}));

jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
  getLocale: async () => 'en',
}));

const getAuthedUser = jest.fn();
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: () => getAuthedUser(),
}));

beforeEach(() => {
  redirect.mockClear();
  getAuthedUser.mockResolvedValue(null);
});

describe('home page', () => {
  it('sends signed-in users to key positions', async () => {
    getAuthedUser.mockResolvedValue({
      id: 'u1',
      nickname: 'ann',
      role: 'user',
    });
    await Home();
    expect(redirect).toHaveBeenCalledWith({
      href: '/think-time',
      locale: 'en',
    });
  });

  it('shows guests the landing', async () => {
    render(await Home());
    expect(redirect).not.toHaveBeenCalled();
  });

  it('leads with the promise of a real coach', async () => {
    render(await Home());
    expect(
      screen.getByRole('heading', { level: 1, name: 'home.headline' }),
    ).toBeInTheDocument();
    expect(screen.getByText('home.subhead')).toBeInTheDocument();
  });

  it('has one main button, to key positions', async () => {
    render(await Home());
    expect(
      screen.getByRole('link', { name: 'home.ctaPrimary' }),
    ).toHaveAttribute('href', '/think-time');
    expect(
      screen.queryByRole('link', { name: 'home.ctaSecondary' }),
    ).not.toBeInTheDocument();
  });

  it('shows a labelled sample question and answer', async () => {
    render(await Home());
    expect(screen.getByText('home.demoLabel')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('line-demo')).getByText(
        'about.features.demo.questions.question',
      ),
    ).toBeInTheDocument();
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
    };
    for (const [key, href] of Object.entries(cards)) {
      expect(
        screen.getByRole('link', {
          name: new RegExp(`home\\.features\\.${key}\\.title`),
        }),
      ).toHaveAttribute('href', href);
    }
    // Lessons are hidden for now.
    expect(
      screen.queryByRole('link', { name: /home\.features\.lessons\.title/ }),
    ).not.toBeInTheDocument();
  });

  it('feature cards show a focus ring for keyboard users', async () => {
    render(await Home());
    expect(
      screen.getByRole('link', { name: /home\.features\.games\.title/ }),
    ).toHaveClass('focus-visible:ring-3');
  });

  it('announces discussion with other players as coming soon', async () => {
    render(await Home());
    expect(
      screen.getByRole('heading', { name: 'home.future.title' }),
    ).toBeInTheDocument();
    expect(screen.getByText('home.future.description')).toBeInTheDocument();
  });
});
