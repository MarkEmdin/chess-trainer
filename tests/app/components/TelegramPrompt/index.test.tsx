import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen, waitFor } from '@/tests/test-utils';
import TelegramPrompt from '@/app/components/TelegramPrompt';

const startTelegramLink = jest.fn();
const setTelegramPromptDismissed = jest.fn();
jest.mock('@/lib/telegram/actions', () => ({
  startTelegramLink: () => startTelegramLink(),
  setTelegramPromptDismissed: (v: boolean) => setTelegramPromptDismissed(v),
}));

beforeEach(() => {
  jest.clearAllMocks();
  startTelegramLink.mockResolvedValue({ url: 'https://t.me/b?start=x' });
  setTelegramPromptDismissed.mockResolvedValue({ ok: true });
  window.open = jest.fn(() => ({
    location: { href: '' },
    close: jest.fn(),
  })) as unknown as typeof window.open;
});

const checkbox = () =>
  screen.getByRole('checkbox', { name: "Don't remind me" });

describe('TelegramPrompt', () => {
  it('offers to connect with an unticked reminder box', () => {
    renderWithIntl(<TelegramPrompt />);
    expect(
      screen.getByText(/when the coach answers\? We'll message you/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Connect Telegram' }),
    ).toBeInTheDocument();
    expect(checkbox()).not.toBeChecked();
  });

  it('starts the link from the button', async () => {
    renderWithIntl(<TelegramPrompt />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Connect Telegram' }),
    );
    expect(startTelegramLink).toHaveBeenCalled();
  });

  it('saves the dismissal, undoes it, and stays on screen', async () => {
    renderWithIntl(<TelegramPrompt />);
    await userEvent.click(checkbox());
    expect(setTelegramPromptDismissed).toHaveBeenLastCalledWith(true);
    expect(checkbox()).toBeChecked();
    await userEvent.click(checkbox());
    expect(setTelegramPromptDismissed).toHaveBeenLastCalledWith(false);
    expect(
      screen.getByRole('button', { name: 'Connect Telegram' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['returns an error', () => Promise.resolve({ ok: false })],
    ['rejects', () => Promise.reject(new Error('offline'))],
  ])('unticks the box again when saving %s', async (_n, impl) => {
    setTelegramPromptDismissed.mockImplementation(impl);
    renderWithIntl(<TelegramPrompt />);
    await userEvent.click(checkbox());
    await waitFor(() => expect(checkbox()).not.toBeChecked());
  });
});
