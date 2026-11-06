import { fireEvent, renderWithIntl, screen } from '@/tests/test-utils';
import FirstVisitPrompt from '@/app/components/FirstVisitPrompt';

const KEY = 'tutorial-seen';

let pathname = '/games';
jest.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        e.preventDefault();
        rest.onClick?.(e);
      }}
    >
      {children}
    </a>
  ),
  usePathname: () => pathname,
}));

const link = () => screen.queryByRole('link', { name: 'Open tutorial' });

beforeEach(() => {
  localStorage.clear();
  pathname = '/games';
});

describe('<FirstVisitPrompt />', () => {
  it('offers the tutorial on a first visit', () => {
    renderWithIntl(<FirstVisitPrompt />);
    expect(link()).toHaveAttribute('href', '/tutorial');
  });

  it('stays away after opening the tutorial', () => {
    renderWithIntl(<FirstVisitPrompt />);
    fireEvent.click(link() as HTMLElement);
    expect(link()).not.toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('1');
  });

  it('stays away after the cross', () => {
    renderWithIntl(<FirstVisitPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(link()).not.toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('1');
  });

  it('shows nothing to a returning visitor', () => {
    localStorage.setItem(KEY, '1');
    renderWithIntl(<FirstVisitPrompt />);
    expect(link()).not.toBeInTheDocument();
  });

  it('is not on the tutorial, and reaching it counts as seen', () => {
    pathname = '/tutorial';
    renderWithIntl(<FirstVisitPrompt />);
    expect(link()).not.toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('1');
  });

  it('does not break when storage is unavailable', () => {
    const get = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });
    const set = jest
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('denied');
      });
    renderWithIntl(<FirstVisitPrompt />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(link()).not.toBeInTheDocument();
    get.mockRestore();
    set.mockRestore();
  });
});
