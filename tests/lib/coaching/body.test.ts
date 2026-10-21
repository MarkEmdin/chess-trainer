import { normalizeBody } from '@/lib/coaching/body';

describe('normalizeBody', () => {
  it('normalizeBody turns CRLF and CR into LF', () => {
    expect(normalizeBody('a\r\nb\rc\n')).toBe('a\nb\nc\n');
  });
});
