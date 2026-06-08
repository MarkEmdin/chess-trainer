// Side to move at a position — the second field of a FEN is "w" or "b".
export function sideToMove(fen: string): 'white' | 'black' {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white';
}
