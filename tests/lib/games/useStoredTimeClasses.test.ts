import { act, renderHook } from '@testing-library/react';
import { useStoredTimeClasses } from '@/lib/games/useStoredTimeClasses';

const STORAGE_KEY = 'games-time-classes';
const ALL = ['bullet', 'blitz', 'rapid'];

describe('useStoredTimeClasses', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to all three time classes', () => {
    const { result } = renderHook(() => useStoredTimeClasses());
    expect(result.current[0]).toEqual(ALL);
  });

  it('reads a stored selection', () => {
    localStorage.setItem(STORAGE_KEY, '["blitz","rapid"]');
    const { result } = renderHook(() => useStoredTimeClasses());
    expect(result.current[0]).toEqual(['blitz', 'rapid']);
  });

  it.each(['junk', '[]', '["daily"]', '{"a":1}'])(
    'falls back to all three for %s',
    (raw) => {
      localStorage.setItem(STORAGE_KEY, raw);
      const { result } = renderHook(() => useStoredTimeClasses());
      expect(result.current[0]).toEqual(ALL);
    },
  );

  it('persists a new selection and syncs another instance', () => {
    const a = renderHook(() => useStoredTimeClasses());
    const b = renderHook(() => useStoredTimeClasses());

    act(() => {
      a.result.current[1](['rapid']);
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe('["rapid"]');
    expect(a.result.current[0]).toEqual(['rapid']);
    expect(b.result.current[0]).toEqual(['rapid']);
  });
});
