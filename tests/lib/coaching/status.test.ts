import { threadStatus } from '@/lib/coaching/status';
import { matchesAskedFilter } from '@/lib/coaching/askedFilter';

const reply = { body: 'ok', created_at: '2026-10-22', variation: null };

describe('threadStatus', () => {
  it('is none without a thread', () => {
    expect(threadStatus(undefined)).toBe('none');
  });

  it('is asked while there is no reply', () => {
    expect(threadStatus({ responses: [] })).toBe('asked');
  });

  it('is answered once the coach replied', () => {
    expect(threadStatus({ responses: [reply] })).toBe('answered');
  });
});

describe('matchesAskedFilter', () => {
  it.each([
    ['none', 'all', true],
    ['asked', 'all', true],
    ['none', 'unasked', true],
    ['asked', 'unasked', false],
    ['answered', 'unasked', false],
    ['none', 'asked', false],
    ['asked', 'asked', true],
    ['answered', 'asked', true],
  ] as const)('%s under %s → %s', (status, filter, expected) => {
    expect(matchesAskedFilter(status, filter)).toBe(expected);
  });
});
