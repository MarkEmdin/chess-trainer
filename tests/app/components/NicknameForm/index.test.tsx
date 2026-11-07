import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import NicknameForm from '@/app/components/NicknameForm';
import { updateNickname } from '@/lib/auth/profileActions';

jest.mock('@/lib/auth/profileActions', () => ({ updateNickname: jest.fn() }));

describe('<NicknameForm />', () => {
  it('shows the current nickname', () => {
    renderWithIntl(<NicknameForm nickname="alice" />);
    expect(screen.getByLabelText(/nickname/i)).toHaveValue('alice');
  });

  it('confirms a saved nickname', async () => {
    jest.mocked(updateNickname).mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderWithIntl(<NicknameForm nickname="alice" />);
    await user.click(screen.getByRole('button', { name: /save nickname/i }));
    expect(jest.mocked(updateNickname).mock.calls[0][1].get('nickname')).toBe(
      'alice',
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/saved/i);
  });

  it('shows the returned error', async () => {
    jest.mocked(updateNickname).mockResolvedValue({ error: 'Taken.' });
    const user = userEvent.setup();
    renderWithIntl(<NicknameForm nickname="alice" />);
    await user.click(screen.getByRole('button', { name: /save nickname/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Taken.');
  });
});
