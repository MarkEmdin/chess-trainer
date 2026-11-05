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

  it('marks own row', () => {
    renderWithIntl(<Leaderboard rows={[r(1, 'A', 7), r(2, 'Me', 1, true)]} />);
    const me = screen.getByText('You').closest('li');
    expect(me).toHaveAttribute('aria-current', 'true');
  });

  it('lists every row, past place 20 too', () => {
    renderWithIntl(<Leaderboard rows={[r(1, 'A', 7), r(25, 'Z', 1)]} />);
    expect(screen.getByText('Z')).toBeInTheDocument();
  });

  it('gives no cup without a position', () => {
    renderWithIntl(<Leaderboard rows={[r(1, 'A', 0), r(1, 'B', 0)]} />);
    expect(screen.queryByLabelText('Place 1')).not.toBeInTheDocument();
    expect(screen.getAllByText('0 positions')).toHaveLength(2);
  });

  it('counts in positions', () => {
    renderWithIntl(
      <Leaderboard rows={[r(1, 'a', 3), r(2, 'b', 1)]} />,
    );
    expect(screen.getByText('3 positions')).toBeInTheDocument();
    expect(screen.getByText('1 position')).toBeInTheDocument();
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
