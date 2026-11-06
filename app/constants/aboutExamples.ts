// Real openings for the boards on /about, as moves from the start position.

// Italian Game: the position a player thought over for a long time.
export const KEY_POSITION = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'];

// Fried Liver: two chips over one line, from the position after `MOVES_START`.
export const MOVES_LINE = [...KEY_POSITION, 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+'];
export const MOVES_START = 7;
export const MOVES_CHIPS = [
  { from: 7, to: 9 },
  { from: 9, to: 13 },
];

// Berlin Defence: the question asked here, and the line of the answer.
export const COACH_POSITION = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6', 'O-O'];
export const COACH_LINE = [
  ...COACH_POSITION,
  'Nxe4',
  'd4',
  'Nd6',
  'Bxc6',
  'dxc6',
  'dxe5',
  'Nf5',
];
export const COACH_CHIPS = [
  { from: COACH_POSITION.length, to: COACH_LINE.length },
];
