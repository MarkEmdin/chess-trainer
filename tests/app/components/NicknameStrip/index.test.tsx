import { renderWithIntl, screen } from '@/tests/test-utils';
import NicknameStrip from '@/app/components/NicknameStrip';

const usePathname = jest.fn();

jest.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
  usePathname: () => usePathname(),
}));

describe('<NicknameStrip />', () => {
  it('links to the nickname screen', () => {
    usePathname.mockReturnValue('/games');
    renderWithIntl(<NicknameStrip />);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/choose-nickname',
    );
  });

  it('stays out of the way on the nickname screen', () => {
    usePathname.mockReturnValue('/choose-nickname');
    renderWithIntl(<NicknameStrip />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
