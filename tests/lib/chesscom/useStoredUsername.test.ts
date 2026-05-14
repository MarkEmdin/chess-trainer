import { act, renderHook } from '@testing-library/react';
import { useStoredUsername } from '@/lib/chesscom/useStoredUsername';

const STORAGE_KEY = 'chesscom-username';

describe('useStoredUsername', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when localStorage is empty', () => {
    const { result } = renderHook(() => useStoredUsername());
    expect(result.current[0]).toBeNull();
  });

  it('reads an existing value synchronously on first render', () => {
    localStorage.setItem(STORAGE_KEY, 'magnuscarlsen');
    const { result } = renderHook(() => useStoredUsername());
    expect(result.current[0]).toBe('magnuscarlsen');
  });

  it('persists a new value to localStorage', () => {
    const { result } = renderHook(() => useStoredUsername());
    act(() => {
      result.current[1]('hikaru');
    });
    expect(result.current[0]).toBe('hikaru');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('hikaru');
  });

  it('removes the key when set to null', () => {
    localStorage.setItem(STORAGE_KEY, 'hikaru');
    const { result } = renderHook(() => useStoredUsername());
    act(() => {
      result.current[1](null);
    });
    expect(result.current[0]).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps multiple hook instances in sync within the same tab', () => {
    const first = renderHook(() => useStoredUsername());
    const second = renderHook(() => useStoredUsername());

    act(() => {
      first.result.current[1]('alirezafirouzja');
    });

    expect(second.result.current[0]).toBe('alirezafirouzja');
  });
});
