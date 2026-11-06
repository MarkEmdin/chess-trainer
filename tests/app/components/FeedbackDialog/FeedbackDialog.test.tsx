import {
  fireEvent,
  renderWithIntl,
  screen,
  waitFor,
} from '../../../test-utils';
import FeedbackDialog from '@/app/components/FeedbackDialog';
import type { FeedbackState } from '@/lib/feedback/actions';

const sendFeedback = jest.fn();
jest.mock('@/lib/feedback/actions', () => ({
  sendFeedback: (...a: unknown[]) => sendFeedback(...a),
}));

const sentForm = () => sendFeedback.mock.calls[0][1] as FormData;

function open() {
  renderWithIntl(<FeedbackDialog />);
  fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
}

function write(text: string) {
  fireEvent.change(screen.getByLabelText('Your message'), {
    target: { value: text },
  });
}

const send = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Send' }));

beforeEach(() => {
  sendFeedback
    .mockReset()
    .mockResolvedValue({ success: true } satisfies FeedbackState);
});

describe('FeedbackDialog', () => {
  it('sends the type, text, contact, page and screen', async () => {
    open();
    fireEvent.click(screen.getByRole('radio', { name: 'Idea' }));
    write('More puzzles');
    fireEvent.change(screen.getByLabelText('Contact (optional)'), {
      target: { value: '@me' },
    });
    send();
    await waitFor(() => expect(sendFeedback).toHaveBeenCalled());
    const form = sentForm();
    expect(form.get('kind')).toBe('idea');
    expect(form.get('body')).toBe('More puzzles');
    expect(form.get('contact')).toBe('@me');
    expect(form.get('page')).toBe(window.location.href);
    expect(form.get('screen')).toBe(
      `${window.innerWidth}×${window.innerHeight}`,
    );
  });

  it('preselects a bug', async () => {
    open();
    expect(screen.getByRole('radio', { name: 'Bug' })).toBeChecked();
  });

  it('thanks the user after sending', async () => {
    open();
    write('Broken');
    send();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Thank you! Your message has been sent.',
    );
    expect(
      screen.queryByRole('button', { name: 'Send' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the text when sending fails', async () => {
    sendFeedback.mockResolvedValue({ error: 'Could not send' });
    open();
    write('Broken');
    send();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not send',
    );
    expect(screen.getByLabelText('Your message')).toHaveValue('Broken');
  });

  it('starts empty when opened again after sending', async () => {
    open();
    write('Broken');
    send();
    await screen.findByRole('status');
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Report a problem' }),
    );
    expect(await screen.findByLabelText('Your message')).toHaveValue('');
  });
});
