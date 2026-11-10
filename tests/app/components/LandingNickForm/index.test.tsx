import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import LandingNickForm from '@/app/components/LandingNickForm';

const push = jest.fn();
jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  localStorage.clear();
  push.mockClear();
});

describe('<LandingNickForm />', () => {
  it('keeps the button disabled until a nickname is typed', () => {
    renderWithIntl(<LandingNickForm />);
    expect(
      screen.getByRole('button', { name: 'Find my positions' }),
    ).toBeDisabled();
  });

  it('saves a trimmed chess.com nickname and opens key positions', async () => {
    renderWithIntl(<LandingNickForm />);
    await userEvent.type(
      screen.getByLabelText('Chess.com username'),
      '  alice {Enter}',
    );
    expect(localStorage.getItem('chesscom-username')).toBe('alice');
    expect(push).toHaveBeenCalledWith('/think-time');
  });

  it('saves a lichess nickname and forgets the chess.com one', async () => {
    localStorage.setItem('chesscom-username', 'old');
    renderWithIntl(<LandingNickForm />);
    await userEvent.click(screen.getByRole('tab', { name: 'Lichess' }));
    await userEvent.type(screen.getByLabelText('Lichess username'), 'bob');
    await userEvent.click(
      screen.getByRole('button', { name: 'Find my positions' }),
    );
    expect(localStorage.getItem('lichess-username')).toBe('bob');
    expect(localStorage.getItem('chesscom-username')).toBeNull();
    expect(push).toHaveBeenCalledWith('/think-time');
  });
});
