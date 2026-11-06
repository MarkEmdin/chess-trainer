import {
  act,
  fireEvent,
  renderWithIntl,
  screen,
  waitFor,
} from '../../../test-utils';
import ResponseLikeToggle from '@/app/components/ResponseLikeToggle';

const setResponseLiked = jest.fn();
jest.mock('@/lib/coaching/actions', () => ({
  setResponseLiked: (id: string, liked: boolean) => setResponseLiked(id, liked),
}));

beforeEach(() => setResponseLiked.mockReset().mockResolvedValue({}));

describe('ResponseLikeToggle', () => {
  it.each([true, false])('reflects liked=%s in aria-pressed', (liked) => {
    renderWithIntl(<ResponseLikeToggle responseId="a1" liked={liked} />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-pressed',
      String(liked),
    );
  });

  it('labels the button by what a click does', () => {
    renderWithIntl(<ResponseLikeToggle responseId="a1" liked />);
    expect(
      screen.getByRole('button', { name: 'Remove like' }),
    ).toBeInTheDocument();
  });

  it('asks for the opposite state on click', async () => {
    renderWithIntl(<ResponseLikeToggle responseId="a1" liked />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(setResponseLiked).toHaveBeenCalledWith('a1', false),
    );
  });

  it('changes at once, before the server answers', async () => {
    let finish = (_: object) => {};
    setResponseLiked.mockReturnValue(new Promise((r) => (finish = r)));
    renderWithIntl(<ResponseLikeToggle responseId="a1" liked />);
    fireEvent.click(screen.getByRole('button'));
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toBeEnabled();
    await act(async () => finish({}));
  });

  it('takes a second tap while the first is on its way', async () => {
    const pending: ((v: object) => void)[] = [];
    setResponseLiked.mockImplementation(
      () => new Promise((r) => pending.push(r)),
    );
    renderWithIntl(<ResponseLikeToggle responseId="a1" liked />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(setResponseLiked).toHaveBeenCalledTimes(2));
    expect(setResponseLiked).toHaveBeenLastCalledWith('a1', true);
    await act(async () => pending.forEach((finish) => finish({})));
  });

  it('shows a translated message and keeps the state when the action fails', async () => {
    setResponseLiked.mockResolvedValue({ error: 'not allowed' });
    renderWithIntl(<ResponseLikeToggle responseId="a1" liked />);
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't update the like. Try again.",
    );
    expect(screen.queryByText('not allowed')).toBeNull();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the error instead of throwing when the call rejects', async () => {
    setResponseLiked.mockRejectedValue(new Error('network'));
    renderWithIntl(<ResponseLikeToggle responseId="a1" liked />);
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Couldn't update the like. Try again.",
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('follows a fresher liked prop from the server', () => {
    const { rerender } = renderWithIntl(
      <ResponseLikeToggle responseId="a1" liked />,
    );
    rerender(<ResponseLikeToggle responseId="a1" liked={false} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });
});
