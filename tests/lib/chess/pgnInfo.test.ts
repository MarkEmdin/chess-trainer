import { readPgnInfo } from '@/lib/chess/pgnInfo';

const CHESSCOM_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[White "alice"]
[Black "bob"]
[WhiteElo "1500"]
[BlackElo "1620"]
[TimeControl "180+2"]

1. e4 {[%clk 0:03:01.5]} 1... e5 {[%clk 0:02:59.9]} 2. Nf3 {[%clk 0:02:55]} *`;

describe('readPgnInfo', () => {
  it('reads players and ratings from the headers', () => {
    const info = readPgnInfo(CHESSCOM_PGN);
    expect(info.white).toEqual({ name: 'alice', rating: 1500 });
    expect(info.black).toEqual({ name: 'bob', rating: 1620 });
  });

  it('builds one clock snapshot per position, starting from the time control', () => {
    const { clocks } = readPgnInfo(CHESSCOM_PGN);
    expect(clocks).toEqual([
      { whiteSeconds: 180, blackSeconds: 180 },
      { whiteSeconds: 181.5, blackSeconds: 180 },
      { whiteSeconds: 181.5, blackSeconds: 179.9 },
      { whiteSeconds: 175, blackSeconds: 179.9 },
    ]);
  });

  it('reads Lichess-style clock comments', () => {
    const { clocks } = readPgnInfo(
      '[White "a"]\n[Black "b"]\n[TimeControl "300+0"]\n\n1. d4 { [%clk 0:05:00] } d5 { [%clk 0:04:58] } *',
    );
    expect(clocks[2]).toEqual({ whiteSeconds: 300, blackSeconds: 298 });
  });

  it('degrades when headers and clocks are missing', () => {
    const info = readPgnInfo('1. e4 e5 *');
    expect(info.white).toEqual({ name: '?' });
    expect(info.black).toEqual({ name: '?' });
    expect(info.clocks).toEqual([
      { whiteSeconds: undefined, blackSeconds: undefined },
    ]);
  });

  it('ignores a non-numeric rating', () => {
    const info = readPgnInfo('[White "a"]\n[WhiteElo "?"]\n\n1. e4 *');
    expect(info.white).toEqual({ name: 'a' });
  });
});
