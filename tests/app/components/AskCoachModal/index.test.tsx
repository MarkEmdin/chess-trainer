import { renderWithIntl, screen, waitFor } from '@/tests/test-utils';
import AskCoachModal from '@/app/components/AskCoachModal';
import { markResponseSeen } from '@/lib/coaching/actions';
import type { Game } from '@/lib/games/types';
import type { MyCoachingRequest } from '@/lib/coaching/useMyCoachingRequests';

jest.mock('@/lib/coaching/actions', () => ({
  markResponseSeen: jest.fn(async () => {}),
}));

// The real modal is the editor + board; here we only check what it is given.
jest.mock('@/app/components/CoachingModal', () => ({
  __esModule: true,
  default: (props: {
    fen: string;
    moveLabel: string;
    subtitle?: string;
    orientation: string;
    ask?: { gameUrl: string; moveIndex: number };
    game?: { pgn: string; moveIndex: number };
    gameUrl?: string;
    thread?: { id: string };
  }) => (
    <div
      data-testid="coaching"
      data-fen={props.fen}
      data-label={props.moveLabel}
      data-orientation={props.orientation}
      data-ask={JSON.stringify(props.ask ?? null)}
      data-game={JSON.stringify(props.game ?? null)}
      data-url={props.gameUrl}
      data-thread={props.thread?.id ?? ''}
    >
      {props.subtitle}
    </div>
  ),
}));

const game = {
  id: 'g1',
  url: 'https://lichess.org/g1',
  pgn: '1. e4 e5 2. Nf3',
  endTime: new Date('2026-10-01T12:00:00Z'),
  userColor: 'black',
} as Game;

const target = { moveIndex: 2, fen: 'FEN', label: '1… e5' };

const thread = (over: Partial<MyCoachingRequest> = {}): MyCoachingRequest => ({
  id: 't1',
  fen: 'FEN',
  body: 'q',
  created_at: '2026-10-02T12:00:00Z',
  variation: null,
  move_index: 6,
  move_san: '3… e5',
  game_url: 'https://lichess.org/other',
  pgn: '1. Nf3 Nc6 2. e4 d6 3. d4 e5',
  response_seen_at: null,
  responses: [],
  ...over,
});

const noop = () => {};

beforeEach(() => jest.mocked(markResponseSeen).mockClear());

it('asks a new question about the target move of this game', () => {
  renderWithIntl(
    <AskCoachModal
      game={game}
      target={target}
      onClose={noop}
      onSubmitted={noop}
      onSeen={noop}
    />,
  );
  const modal = screen.getByTestId('coaching');
  expect(modal).toHaveAttribute('data-fen', 'FEN');
  expect(modal).toHaveAttribute('data-label', '1… e5');
  expect(modal).toHaveAttribute('data-orientation', 'black');
  expect(JSON.parse(modal.dataset.ask!)).toEqual({
    gameUrl: 'https://lichess.org/g1',
    moveIndex: 2,
  });
  expect(JSON.parse(modal.dataset.game!)).toEqual({
    pgn: '1. e4 e5 2. Nf3',
    moveIndex: 2,
  });
  expect(modal).toHaveTextContent('Oct 1, 2026');
});

it('opens the earlier question in the game it was asked in', () => {
  renderWithIntl(
    <AskCoachModal
      game={game}
      target={target}
      thread={thread()}
      onClose={noop}
      onSubmitted={noop}
      onSeen={noop}
    />,
  );
  const modal = screen.getByTestId('coaching');
  expect(modal).toHaveAttribute('data-thread', 't1');
  expect(modal).toHaveAttribute('data-label', '3… e5');
  expect(modal).toHaveAttribute('data-url', 'https://lichess.org/other');
  expect(JSON.parse(modal.dataset.game!)).toEqual({
    pgn: '1. Nf3 Nc6 2. e4 d6 3. d4 e5',
    moveIndex: 6,
  });
  expect(modal).toHaveTextContent(
    'You already asked about this position in another game',
  );
});

it('keeps the game date for a question from this game', () => {
  renderWithIntl(
    <AskCoachModal
      game={game}
      target={target}
      thread={thread({ game_url: game.url })}
      onClose={noop}
      onSubmitted={noop}
      onSeen={noop}
    />,
  );
  expect(screen.getByTestId('coaching')).toHaveTextContent('Oct 1, 2026');
});

it('marks an unseen answer as read', async () => {
  const onSeen = jest.fn();
  renderWithIntl(
    <AskCoachModal
      game={game}
      target={target}
      thread={thread({
        responses: [{ body: 'a', created_at: 'x', variation: null }],
      })}
      onClose={noop}
      onSubmitted={noop}
      onSeen={onSeen}
    />,
  );
  await waitFor(() => expect(onSeen).toHaveBeenCalled());
  expect(markResponseSeen).toHaveBeenCalledWith('t1');
});

it('leaves a question without answers alone', () => {
  renderWithIntl(
    <AskCoachModal
      game={game}
      target={target}
      thread={thread()}
      onClose={noop}
      onSubmitted={noop}
      onSeen={noop}
    />,
  );
  expect(markResponseSeen).not.toHaveBeenCalled();
});
