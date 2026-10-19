import { renderHook, waitFor } from '@testing-library/react';
import { fetchLastGames as fetchChessComGames } from '@/lib/chesscom/api';
import { fetchLastGames as fetchLichessGames } from '@/lib/lichess/api';
import { useChessComGames } from '@/lib/chesscom/useChessComGames';
import { useLichessGames } from '@/lib/lichess/useLichessGames';

jest.mock('@/lib/chesscom/api', () => ({ fetchLastGames: jest.fn() }));
jest.mock('@/lib/lichess/api', () => ({ fetchLastGames: jest.fn() }));

const mockChessCom = fetchChessComGames as jest.MockedFunction<
  typeof fetchChessComGames
>;
const mockLichess = fetchLichessGames as jest.MockedFunction<
  typeof fetchLichessGames
>;

describe('games hooks request limit', () => {
  beforeEach(() => {
    mockChessCom.mockResolvedValue([]);
    mockLichess.mockResolvedValue([]);
  });

  it('useChessComGames requests the last 50 games', async () => {
    renderHook(() => useChessComGames('limit-alice'));
    await waitFor(() =>
      expect(mockChessCom).toHaveBeenCalledWith('limit-alice', 50),
    );
  });

  it('useLichessGames requests the last 50 games', async () => {
    renderHook(() => useLichessGames('limit-bob'));
    await waitFor(() =>
      expect(mockLichess).toHaveBeenCalledWith('limit-bob', 50),
    );
  });
});
