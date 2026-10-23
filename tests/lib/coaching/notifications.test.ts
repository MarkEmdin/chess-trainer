import {
  countNotifications,
  formatBadgeCount,
  isUnseen,
  type NotificationRow,
} from '@/lib/coaching/notifications';

const answer = { body: 'ok' };

describe('isUnseen', () => {
  it('is true for an answer nobody opened', () => {
    expect(isUnseen({ responses: [answer], response_seen_at: null })).toBe(
      true,
    );
  });

  it('is false once the answer was opened', () => {
    expect(
      isUnseen({ responses: [answer], response_seen_at: '2026-10-23T12:00Z' }),
    ).toBe(false);
  });

  it('is false while there is no answer', () => {
    expect(isUnseen({ responses: [], response_seen_at: null })).toBe(false);
  });

  it('is false when the read state was not loaded', () => {
    expect(isUnseen({ responses: [answer] })).toBe(false);
  });
});

describe('formatBadgeCount', () => {
  it.each([
    [0, null],
    [1, '1'],
    [9, '9'],
    [10, '9+'],
    [12, '9+'],
  ])('%i → %p', (n, expected) => {
    expect(formatBadgeCount(n)).toBe(expected);
  });
});

describe('countNotifications', () => {
  const row = (
    user_id: string,
    answered: boolean,
    response_seen_at: string | null = null,
  ): NotificationRow => ({
    user_id,
    response_seen_at,
    coaching_responses: answered ? [{ id: 'x' }] : [],
  });

  const rows = [
    row('u1', true),
    row('u1', true, '2026-10-23T12:00Z'),
    row('u1', false),
    row('u2', true),
  ];

  it('counts only own unseen answers for a student', () => {
    expect(countNotifications(rows, { id: 'u1', role: 'user' })).toEqual({
      unseenAnswers: 1,
      newQuestions: null,
    });
  });

  it('adds unanswered questions for an admin', () => {
    expect(countNotifications(rows, { id: 'u1', role: 'admin' })).toEqual({
      unseenAnswers: 1,
      newQuestions: 1,
    });
  });

  it("counts the admin's own unanswered question as new too", () => {
    expect(
      countNotifications([row('a1', false), row('u2', false)], {
        id: 'a1',
        role: 'admin',
      }).newQuestions,
    ).toBe(2);
  });
});
