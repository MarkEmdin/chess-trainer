import { formatSeconds } from '@/lib/chesscom/format';

describe('formatSeconds', () => {
  it('pads minutes and seconds with leading zeros', () => {
    expect(formatSeconds(0)).toBe('00:00');
    expect(formatSeconds(5)).toBe('00:05');
    expect(formatSeconds(59)).toBe('00:59');
  });

  it('rolls seconds into minutes', () => {
    expect(formatSeconds(60)).toBe('01:00');
    expect(formatSeconds(75)).toBe('01:15');
    expect(formatSeconds(599)).toBe('09:59');
  });

  it('shows hours without zero-padding when present', () => {
    expect(formatSeconds(3600)).toBe('1:00:00');
    expect(formatSeconds(3661)).toBe('1:01:01');
    expect(formatSeconds(7325)).toBe('2:02:05');
  });

  it('clamps negative input to zero', () => {
    expect(formatSeconds(-5)).toBe('00:00');
    expect(formatSeconds(-1)).toBe('00:00');
  });

  it('floors fractional seconds', () => {
    expect(formatSeconds(5.9)).toBe('00:05');
    expect(formatSeconds(59.7)).toBe('00:59');
  });
});
