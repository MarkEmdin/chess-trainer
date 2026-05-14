import { act, renderHook } from '@testing-library/react';
import { useStoredThreshold } from '@/lib/chesscom/useStoredThreshold';

const STORAGE_KEY = 'chesscom-think-threshold';
const DEFAULT = 45;

describe('useStoredThreshold', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the 45s default when nothing is stored', () => {
    const { result } = renderHook(() => useStoredThreshold());
    expect(result.current[0]).toBe(DEFAULT);
  });

  it('parses an integer stored as a string', () => {
    localStorage.setItem(STORAGE_KEY, '90');
    const { result } = renderHook(() => useStoredThreshold());
    expect(result.current[0]).toBe(90);
  });

  it('falls back to the default when the stored value is non-numeric', () => {
    localStorage.setItem(STORAGE_KEY, 'not-a-number');
    const { result } = renderHook(() => useStoredThreshold());
    expect(result.current[0]).toBe(DEFAULT);
  });

  it('persists a new value as a string and reads it back', () => {
    const { result } = renderHook(() => useStoredThreshold());
    act(() => {
      result.current[1](60);
    });
    expect(result.current[0]).toBe(60);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('60');
  });

  it('syncs across hook instances within the same tab', () => {
    const a = renderHook(() => useStoredThreshold());
    const b = renderHook(() => useStoredThreshold());

    act(() => {
      a.result.current[1](30);
    });

    expect(b.result.current[0]).toBe(30);
  });
});
