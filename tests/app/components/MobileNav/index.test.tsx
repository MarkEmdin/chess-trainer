import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import MobileNav from '@/app/components/MobileNav';

// `@/i18n/navigation` wraps Next's router under the hood; outside of a Next
// app there's no router context for it to read. The drawer also embeds
// LanguageToggle, which calls useRouter() on every render, so we replace
// the module wholesale with no-op shims.
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

const navLinks = [
  { href: '/lessons/theory', key: 'theory' },
  { href: '/games', key: 'games' },
] as const;

describe('<MobileNav />', () => {
  it('renders the menu trigger', () => {
    renderWithIntl(<MobileNav navLinks={navLinks} />);
    expect(
      screen.getByRole('button', { name: /open menu/i }),
    ).toBeInTheDocument();
    // Drawer content is portal-rendered and absent until the trigger fires.
    expect(
      screen.queryByRole('link', { name: /theory/i }),
    ).not.toBeInTheDocument();
  });

  it('opens the drawer with all nav links on trigger click', async () => {
    const user = userEvent.setup();
    renderWithIntl(<MobileNav navLinks={navLinks} />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));

    expect(screen.getByRole('link', { name: /theory/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /games/i })).toBeInTheDocument();
  });

  it('closes the drawer when a nav link is clicked', async () => {
    const user = userEvent.setup();
    renderWithIntl(<MobileNav navLinks={navLinks} />);
    await user.click(screen.getByRole('button', { name: /open menu/i }));

    await user.click(screen.getByRole('link', { name: /theory/i }));

    // The drawer's onOpenChange(false) unmounts the portal content.
    expect(
      screen.queryByRole('link', { name: /theory/i }),
    ).not.toBeInTheDocument();
  });
});
