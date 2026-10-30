import userEvent from '@testing-library/user-event';
import { renderWithIntl, screen, waitFor } from '@/tests/test-utils';
import TelegramConnect from '@/app/components/TelegramConnect';

const startTelegramLink = jest.fn();
const disconnectTelegram = jest.fn();
jest.mock('@/lib/telegram/actions', () => ({
  startTelegramLink: () => startTelegramLink(),
  disconnectTelegram: () => disconnectTelegram(),
}));

let tab: { location: { href: string }; close: jest.Mock };
beforeEach(() => {
  jest.clearAllMocks();
  tab = { location: { href: '' }, close: jest.fn() };
  window.open = jest.fn(() => tab) as unknown as typeof window.open;
});

describe('TelegramConnect', () => {
  it.each([
    [false, /coach answers your question/i],
    [true, /every new student question/i],
  ])(
    'shows the description and Connect button (admin=%s)',
    (isAdmin, text) => {
      renderWithIntl(<TelegramConnect connected={false} isAdmin={isAdmin} />);
      expect(screen.getByText(text)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Connect Telegram' }),
      ).toBeInTheDocument();
    },
  );

  it('opens a tab, sends it to the link and shows the hint', async () => {
    startTelegramLink.mockResolvedValue({ url: 'https://t.me/b?start=x' });
    renderWithIntl(<TelegramConnect connected={false} isAdmin={false} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Connect Telegram' }),
    );
    expect(window.open).toHaveBeenCalledWith('', '_blank');
    await waitFor(() =>
      expect(tab.location.href).toBe('https://t.me/b?start=x'),
    );
    expect(await screen.findByText(/Refresh this page/)).toBeInTheDocument();
  });

  it('closes the tab and shows the error when the action fails', async () => {
    startTelegramLink.mockResolvedValue({ error: 'You must be signed in' });
    renderWithIntl(<TelegramConnect connected={false} isAdmin={false} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Connect Telegram' }),
    );
    expect(
      await screen.findByText('You must be signed in'),
    ).toBeInTheDocument();
    expect(tab.close).toHaveBeenCalled();
  });

  it('closes the tab and shows an error when the action rejects', async () => {
    startTelegramLink.mockRejectedValue(new Error('boom'));
    renderWithIntl(<TelegramConnect connected={false} isAdmin={false} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Connect Telegram' }),
    );
    expect(
      await screen.findByText(/Couldn't start the connection/),
    ).toBeInTheDocument();
    expect(tab.close).toHaveBeenCalled();
  });

  it('when connected shows Connected and disconnects on click', async () => {
    disconnectTelegram.mockResolvedValue(undefined);
    renderWithIntl(<TelegramConnect connected isAdmin={false} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(disconnectTelegram).toHaveBeenCalled();
  });
});
