import { act, renderHook } from '@testing-library/react';
import { Chess } from 'chess.js';
import { useVariationRecorder } from '@/app/components/CoachingModal/useVariationRecorder';

const START = new Chess().fen();

describe('useVariationRecorder', () => {
  it('records legal moves', () => {
    const { result } = renderHook(() => useVariationRecorder(START));
    let ok = false;
    act(() => {
      ok = result.current.tryMove('e2', 'e4');
    });
    expect(ok).toBe(true);
    expect(result.current.moves).toEqual(['e4']);
    expect(result.current.fen).toContain('4P3');
    expect(result.current.lastMove).toEqual({ from: 'e2', to: 'e4' });
  });

  it('rejects illegal moves', () => {
    const { result } = renderHook(() => useVariationRecorder(START));
    let ok = true;
    act(() => {
      ok = result.current.tryMove('e2', 'e5');
    });
    expect(ok).toBe(false);
    expect(result.current.moves).toEqual([]);
  });

  it('auto-promotes to a queen', () => {
    const { result } = renderHook(() =>
      useVariationRecorder('8/P6k/8/8/8/8/8/K7 w - - 0 1'),
    );
    act(() => {
      result.current.tryMove('a7', 'a8');
    });
    expect(result.current.moves).toEqual(['a8=Q']);
  });

  it('moves with two taps', () => {
    const { result } = renderHook(() => useVariationRecorder(START));
    act(() => result.current.clickSquare('g1'));
    expect(result.current.selected).toBe('g1');
    act(() => result.current.clickSquare('f3'));
    expect(result.current.moves).toEqual(['Nf3']);
    expect(result.current.selected).toBeNull();
  });

  it('ignores taps on empty squares or opponent pieces with nothing selected', () => {
    const { result } = renderHook(() => useVariationRecorder(START));
    act(() => result.current.clickSquare('e4'));
    expect(result.current.selected).toBeNull();
    act(() => result.current.clickSquare('e7'));
    expect(result.current.selected).toBeNull();
  });

  it('reselects when tapping another own piece', () => {
    const { result } = renderHook(() => useVariationRecorder(START));
    act(() => result.current.clickSquare('g1'));
    act(() => result.current.clickSquare('b1'));
    expect(result.current.selected).toBe('b1');
    expect(result.current.moves).toEqual([]);
  });

  it('undoes and clears', () => {
    const { result } = renderHook(() => useVariationRecorder(START));
    act(() => {
      result.current.tryMove('e2', 'e4');
    });
    act(() => {
      result.current.tryMove('e7', 'e5');
    });
    act(() => result.current.undo());
    expect(result.current.moves).toEqual(['e4']);
    act(() => result.current.clear());
    expect(result.current.moves).toEqual([]);
    expect(result.current.fen).toBe(START);
  });

  it('continues from an initial line', () => {
    const { result } = renderHook(() => useVariationRecorder(START, ['e4']));
    expect(result.current.fen).toContain('4P3');
    act(() => {
      result.current.tryMove('e7', 'e5');
    });
    expect(result.current.moves).toEqual(['e4', 'e5']);
  });

  it('stops at the move cap', () => {
    const { result } = renderHook(() => useVariationRecorder(START));
    const shuffle: [string, string][] = [
      ['g1', 'f3'],
      ['g8', 'f6'],
      ['f3', 'g1'],
      ['f6', 'g8'],
    ];
    for (let i = 0; i < 40; i++) {
      act(() => {
        result.current.tryMove(...shuffle[i % 4]);
      });
    }
    expect(result.current.moves).toHaveLength(40);
    let ok = true;
    act(() => {
      ok = result.current.tryMove('g1', 'f3');
    });
    expect(ok).toBe(false);
    expect(result.current.moves).toHaveLength(40);
  });

  it('accepts no moves after mate', () => {
    const { result } = renderHook(() =>
      useVariationRecorder(
        'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
      ),
    );
    let ok = true;
    act(() => {
      ok = result.current.tryMove('e2', 'e3');
    });
    expect(ok).toBe(false);
  });
});
