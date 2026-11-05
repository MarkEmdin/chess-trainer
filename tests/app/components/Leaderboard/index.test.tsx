import { renderWithIntl, screen } from '../../../test-utils';
import Leaderboard from '@/app/components/Leaderboard';
import type { LeaderboardRow } from '@/lib/leaderboard/types';

const r = (
  place: number,
  nickname: string,
  likes: number,
  is_me = false,
): LeaderboardRow => ({ place, nickname, likes, is_me });

describe('Leaderboard', () => {
  it('shows cups for places 1-3 (ties share a cup) and a number after', () => {
    renderWithIntl(
      <Leaderboard
        rows={[r(1, 'A', 7), r(2, 'B', 5), r(2, 'C', 5), r(4, 'D', 3)]}
      />,
    );
    expect(screen.getByLabelText('Place 1')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Place 2')).toHaveLength(2);
    expect(screen.queryByLabelText('Place 4')).not.toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('marks own row and pins an outside row after a separator', () => {
    renderWithIntl(
      <Leaderboard rows={[r(1, 'A', 7), r(21, 'Me', 1, true)]} />,
    );
    const me = screen.getByText('You').closest('li');
    expect(me).toHaveAttribute('aria-current', 'true');
    const sep = screen.getByText('···');
    expect(
      sep.compareDocumentPosition(me as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows the empty state', () => {
    renderWithIntl(<Leaderboard rows={[]} />);
    expect(
      screen.getByText(
        'No likes yet this week. Ask a coach a good question!',
      ),
    ).toBeInTheDocument();
  });
});
