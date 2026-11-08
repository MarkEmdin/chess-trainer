import { renderWithIntl, screen, within } from '@/tests/test-utils';
import SiteNav from '@/app/components/SiteNav';

let pathname = '/';
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
  usePathname: () => pathname,
}));

function desktopLinks() {
  return within(screen.getByTestId('site-nav-desktop')).getAllByRole('link');
}

describe('<SiteNav />', () => {
  beforeEach(() => {
    pathname = '/';
  });

  it('links to positions, games, leaderboard and help (learn hidden for now)', () => {
    renderWithIntl(<SiteNav />);
    expect(desktopLinks().map((a) => a.getAttribute('href'))).toEqual([
      '/think-time',
      '/games',
      '/leaderboard',
      '/tutorial',
    ]);
    expect(desktopLinks().map((a) => a.textContent)).toEqual([
      'Positions',
      'Games',
      'Leaderboard',
      'Help',
    ]);
  });

  it('marks the current section', () => {
    pathname = '/games/123';
    renderWithIntl(<SiteNav />);
    const current = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current.map((a) => a.getAttribute('href'))).toEqual([
      '/games',
      '/games',
    ]);
  });

  it('renders a bottom tab bar for mobile', () => {
    renderWithIntl(<SiteNav />);
    const bar = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(bar).getAllByRole('link')).toHaveLength(4);
  });
});
