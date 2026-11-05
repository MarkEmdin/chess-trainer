import {
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
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    );
  });

  it('shows a translated message and keeps the state when the action fails', async () => {
    setResponseLiked.mockResolvedValue({ error: 'not allowed' });
    renderWithIntl(<ResponseLikeToggle responseId="a1" liked />);
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only coaches can reply.',
    );
    expect(screen.queryByText('not allowed')).toBeNull();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});
