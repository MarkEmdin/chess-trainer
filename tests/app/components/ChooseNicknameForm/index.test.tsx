import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen } from '@/tests/test-utils';
import ChooseNicknameForm from '@/app/components/ChooseNicknameForm';
import { chooseNickname } from '@/lib/auth/profileActions';

jest.mock('@/lib/auth/profileActions', () => ({ chooseNickname: jest.fn() }));

describe('<ChooseNicknameForm />', () => {
  it('submits the typed nickname and shows the returned error', async () => {
    jest.mocked(chooseNickname).mockResolvedValue({ error: 'Taken.' });
    const user = userEvent.setup();
    renderWithIntl(<ChooseNicknameForm />);
    await user.type(screen.getByLabelText(/nickname/i), 'alice');
    await user.click(screen.getByRole('button', { name: /continue/i }));
    const formData = jest.mocked(chooseNickname).mock.calls[0][1];
    expect(formData.get('nickname')).toBe('alice');
    expect(await screen.findByRole('alert')).toHaveTextContent('Taken.');
  });
});
