import type { Game } from '@/lib/chesscom/types';

type Props = {
  game: Game;
  // Extra classes for the rating spans, e.g. "text-base" inside a DialogTitle
  // where the default would otherwise inherit the larger title size.
  ratingClassName?: string;
};

// Renders "white vs black" with the user's name wrapped in <strong> for
// emphasis. White is always on the left to match standard chess notation, so
// when the user played black they appear on the right.
export default function GameMatchup({ game, ratingClassName }: Props) {
  const userIsWhite = game.userColor === 'white';
  const white = userIsWhite ? game.user : game.opponent;
  const black = userIsWhite ? game.opponent : game.user;
  const ratingClasses = `text-muted-foreground${ratingClassName ? ` ${ratingClassName}` : ''}`;

  return (
    <>
      {userIsWhite ? <strong>{white.username}</strong> : white.username}
      <span className={ratingClasses}> ({white.rating})</span>
      {' vs '}
      {userIsWhite ? black.username : <strong>{black.username}</strong>}
      <span className={ratingClasses}> ({black.rating})</span>
    </>
  );
}
