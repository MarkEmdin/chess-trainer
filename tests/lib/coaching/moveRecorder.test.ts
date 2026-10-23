import {
  activateChip,
  backToKey,
  boardFen,
  canUndo,
  clearDrawings,
  currentDrawing,
  initialRecorder,
  markTyped,
  recordMove,
  recorderContent,
  syncChips,
  toggleMark,
  undoMove,
  type Edit,
  type RecorderState,
} from '@/lib/coaching/moveRecorder';

// Italian game, black to move.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

// Plays a move and fails the test on an error, returning state and edit.
function play(
  s: RecorderState,
  from: string,
  to: string,
): { state: RecorderState; edit: Edit } {
  const result = recordMove(s, from, to);
  if ('error' in result) throw new Error(`unexpected ${result.error}`);
  return result;
}

describe('recordMove', () => {
  it('inserts a chip for the first move', () => {
    const { state, edit } = play(initialRecorder(FEN), 'd7', 'd6');
    expect(edit).toEqual({ kind: 'insert', id: state.active, label: '3… d6' });
    expect(state.cursor).toEqual({ line: expect.any(String), ply: 1 });
  });

  it('extends the chip while nothing was typed', () => {
    const first = play(initialRecorder(FEN), 'd7', 'd6');
    const { state, edit } = play(first.state, 'c2', 'c3');
    expect(edit).toEqual({
      kind: 'relabel',
      id: first.state.active,
      label: '3… d6 4. c3',
    });
    expect(state.chips[state.active!]).toMatchObject({ from: 0, to: 2 });
  });

  it('continues the line in a new chip after typing', () => {
    const first = play(initialRecorder(FEN), 'd7', 'd6');
    const { state, edit } = play(markTyped(first.state), 'c2', 'c3');
    expect(edit).toMatchObject({ kind: 'insert', label: '4. c3' });
    expect(state.active).not.toBe(first.state.active);
    expect(state.chips[state.active!]).toEqual({
      line: first.state.cursor.line,
      from: 1,
      to: 2,
    });
  });

  it('starts a new line after going back to the key position', () => {
    const first = play(initialRecorder(FEN), 'd7', 'd6');
    const { state, edit } = play(backToKey(first.state), 'g8', 'f6');
    expect(edit).toMatchObject({ kind: 'insert', label: '3… Nf6' });
    expect(state.cursor.line).not.toBe(first.state.cursor.line);
    expect(Object.keys(state.lines)).toHaveLength(2);
  });

  it('branches a new line from a chip in the middle of a line', () => {
    let s = play(initialRecorder(FEN), 'd7', 'd6').state;
    const firstChip = s.active!;
    s = play(markTyped(s), 'c2', 'c3').state;
    const before = { ...s.chips };
    const { state, edit } = play(activateChip(s, firstChip), 'b1', 'c3');
    expect(edit).toMatchObject({ kind: 'insert', label: '4. Nc3' });
    expect(state.chips[firstChip]).toEqual(before[firstChip]);
    expect(state.cursor.line).not.toBe(before[firstChip].line);
    expect(state.lines[state.cursor.line!].slice(0, 1)).toEqual(['d6']);
  });

  it('inserts instead of relabelling once the active chip was deleted', () => {
    const first = play(initialRecorder(FEN), 'd7', 'd6');
    const synced = syncChips(first.state, []);
    expect(synced.active).toBeNull();
    const { edit } = play(synced, 'c2', 'c3');
    expect(edit).toMatchObject({ kind: 'insert', label: '4. c3' });
  });

  it('refuses an illegal move', () => {
    expect(recordMove(initialRecorder(FEN), 'e2', 'e4')).toEqual({
      error: 'illegal',
    });
  });

  it('refuses the 41st move of a line', () => {
    let s = initialRecorder(FEN);
    // Knights shuffle: legal forever.
    const shuffle = [
      ['g8', 'f6'],
      ['f3', 'g1'],
      ['f6', 'g8'],
      ['g1', 'f3'],
    ];
    for (let i = 0; i < 40; i++) {
      const [from, to] = shuffle[i % 4];
      s = play(s, from, to).state;
    }
    expect(recordMove(s, 'g8', 'f6')).toEqual({ error: 'lineTooLong' });
  });

  it('refuses an 11th line', () => {
    let s = initialRecorder(FEN);
    for (let i = 0; i < 10; i++) s = play(backToKey(s), 'd7', 'd6').state;
    expect(recordMove(backToKey(s), 'd7', 'd6')).toEqual({
      error: 'tooManyLines',
    });
  });

  it('refuses a 31st chip', () => {
    let s = initialRecorder(FEN);
    const shuffle = [
      ['g8', 'f6'],
      ['f3', 'g1'],
      ['f6', 'g8'],
      ['g1', 'f3'],
    ];
    for (let i = 0; i < 30; i++) {
      const [from, to] = shuffle[i % 4];
      s = play(markTyped(s), from, to).state;
    }
    // 30 shuffle moves leave the black knight on f6.
    expect(recordMove(markTyped(s), 'f6', 'g8')).toEqual({
      error: 'tooManyChips',
    });
  });
});

describe('undoMove', () => {
  it('shrinks the active chip, then removes it', () => {
    let s = play(initialRecorder(FEN), 'd7', 'd6').state;
    s = play(s, 'c2', 'c3').state;
    const chip = s.active!;
    expect(canUndo(s)).toBe(true);

    const once = undoMove(s);
    expect(once.edit).toEqual({ kind: 'relabel', id: chip, label: '3… d6' });
    expect(once.state.lines[once.state.cursor.line!]).toEqual(['d6']);

    const twice = undoMove(once.state);
    expect(twice.edit).toEqual({ kind: 'remove', id: chip });
    expect(twice.state.cursor).toEqual({ line: null, ply: 0 });
    expect(boardFen(twice.state)).toBe(FEN);
  });

  it('is not allowed when a later chip continues the line', () => {
    let s = play(initialRecorder(FEN), 'd7', 'd6').state;
    const first = s.active!;
    s = play(markTyped(s), 'c2', 'c3').state;
    const back = activateChip(s, first);
    expect(canUndo(back)).toBe(false);
    expect(undoMove(back)).toEqual({ state: back, edit: null });
  });
});

describe('drawings', () => {
  it('toggles a circle on the shown position', () => {
    const s = play(initialRecorder(FEN), 'd7', 'd6').state;
    const on = toggleMark(s, 'e4', 'e4');
    expect(currentDrawing(on).circles).toEqual(['e4']);
    expect(currentDrawing(toggleMark(on, 'e4', 'e4')).circles).toEqual([]);
  });

  it('toggles an arrow and stores it under the line ply', () => {
    const s = play(initialRecorder(FEN), 'd7', 'd6').state;
    const on = toggleMark(s, 'c4', 'f7');
    expect(on.drawings[`${s.cursor.line}:1`].arrows).toEqual([['c4', 'f7']]);
    expect(currentDrawing(toggleMark(on, 'c4', 'f7')).arrows).toEqual([]);
  });

  it('ignores a 21st circle', () => {
    let s = initialRecorder(FEN);
    const squares = 'abcdefgh'
      .split('')
      .flatMap((f) => ['3', '4', '5'].map((r) => f + r));
    for (const sq of squares.slice(0, 21)) s = toggleMark(s, sq, sq);
    expect(currentDrawing(s).circles).toHaveLength(20);
  });

  it('clears the shown position only', () => {
    let s = toggleMark(initialRecorder(FEN), 'e4', 'e4');
    s = play(s, 'd7', 'd6').state;
    s = toggleMark(s, 'd6', 'd6');
    s = clearDrawings(s);
    expect(currentDrawing(s).circles).toEqual([]);
    expect(s.drawings.key.circles).toEqual(['e4']);
  });
});

describe('recorderContent', () => {
  it('keeps only referenced lines and their drawings', () => {
    let s = toggleMark(initialRecorder(FEN), 'e4', 'e4');
    s = play(s, 'd7', 'd6').state;
    const kept = s.cursor.line!;
    const keptChip = s.active!;
    s = toggleMark(s, 'd6', 'd6');
    s = play(backToKey(s), 'g8', 'f6').state;
    s = toggleMark(s, 'f6', 'f6');

    const content = recorderContent(s, [
      { t: 'text', text: 'Хотел ' },
      { t: 'moves', ...s.chips[keptChip] },
    ]);
    expect(Object.keys(content.lines)).toEqual([kept]);
    expect(Object.keys(content.drawings).sort()).toEqual(
      ['key', `${kept}:1`].sort(),
    );
  });
});
