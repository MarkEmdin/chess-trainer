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

jest.mock('@/app/components/LandingNickForm', () => ({
  __esModule: true,
  default: () => <form data-testid="nick-form" />,
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

  it('asks for the nickname right on the first screen', async () => {
    render(await Home());
    expect(screen.getByTestId('nick-form')).toBeInTheDocument();
  });

  it('has no feature cards and no coming-soon block', async () => {
    render(await Home());
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryByText(/home.future/)).toBeNull();
    expect(screen.queryByText(/home.features/)).toBeNull();
  });
});
