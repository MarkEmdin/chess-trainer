import { renderWithIntl, screen, within } from '@/tests/test-utils';
import Header from '@/app/components/Header';

jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

// The header embeds LanguageToggle, which calls useRouter() on render.
jest.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/',
}));

jest.mock('@/app/components/NotificationBell', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/lib/auth/actions', () => ({ signOut: jest.fn() }));
jest.mock('@/lib/auth/profileActions', () => ({
  updatePreferredLocale: jest.fn(),
}));

const getAuthedUser = jest.fn();
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: () => getAuthedUser(),
}));

const ann = { id: 'u1', nickname: 'ann', role: 'user' };

async function renderHeader() {
  const ui = await Header();
  return renderWithIntl(<>{ui}</>);
}

describe('<Header />', () => {
  it('shows the account menu, not a login link, when signed in', async () => {
    getAuthedUser.mockResolvedValue(ann);
    await renderHeader();
    expect(
      screen.getByRole('button', { name: 'Account menu' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'auth.signIn' }),
    ).not.toBeInTheDocument();
  });

  it('shows a login link without opening the drawer when signed out', async () => {
    getAuthedUser.mockResolvedValue(null);
    await renderHeader();
    expect(screen.getByRole('link', { name: 'auth.signIn' })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(
      screen.queryByRole('button', { name: 'Account menu' }),
    ).not.toBeInTheDocument();
  });

  it('shows the language toggle in the header', async () => {
    getAuthedUser.mockResolvedValue(null);
    await renderHeader();
    expect(
      screen.getByRole('button', { name: 'Toggle language' }),
    ).toBeInTheDocument();
  });

  it('shows the main nav links', async () => {
    getAuthedUser.mockResolvedValue(ann);
    await renderHeader();
    expect(
      within(screen.getByTestId('site-nav-desktop')).getByRole('link', {
        name: 'Positions',
      }),
    ).toHaveAttribute('href', '/think-time');
  });
});
