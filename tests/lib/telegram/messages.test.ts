import {
  connectedMessage,
  infoMessage,
  newQuestionMessage,
  previewBody,
  questionListMessage,
  toBotLocale,
} from '@/lib/telegram/messages';

const now = new Date('2026-10-30T12:00:00Z');
const item = (i: number) => ({
  nickname: `n${i}`,
  moveSan: 'e4',
  createdAt: '2026-10-30T11:00:00Z',
  url: `https://x.test/en/admin?request=${i}`,
});

describe('telegram messages', () => {
  it('newQuestionMessage escapes nickname and body', () => {
    const m = newQuestionMessage('en', {
      nickname: '<script>',
      moveSan: 'Nf3',
      body: '<b>hi</b> & bye',
      url: 'https://x.test/q',
    });
    expect(m.text).toContain('&lt;script&gt;');
    expect(m.text).not.toContain('<script>');
    expect(m.text).toContain('&lt;b&gt;hi&lt;/b&gt; &amp; bye');
    expect(m.buttons).toEqual([{ text: 'Open and answer', url: 'https://x.test/q' }]);
  });

  it('previewBody cuts a 5000-char body to <= 301 chars ending with an ellipsis, on a space', () => {
    const body = 'word '.repeat(1000);
    const p = previewBody(body);
    expect(p.length).toBeLessThanOrEqual(301);
    expect(p.endsWith('…')).toBe(true);
    expect(p.endsWith('word…')).toBe(true);
  });

  it('previewBody leaves short bodies alone', () => {
    expect(previewBody('short')).toBe('short');
  });

  it('questionListMessage with 12 items shows 10 buttons plus admin button and the remainder', () => {
    const items = Array.from({ length: 12 }, (_, i) => item(i));
    const m = questionListMessage('en', items, 'https://x.test/en/admin', now);
    expect(m.buttons).toHaveLength(11);
    expect(m.buttons![10]).toEqual({ text: 'All questions', url: 'https://x.test/en/admin' });
    expect(m.text).toContain('2');
    expect(m.text).toContain('12');
  });

  it('questionListMessage with 0 items returns the empty text and no buttons', () => {
    const m = questionListMessage('en', [], 'https://x.test/en/admin', now);
    expect(m.text).toBe('No unanswered questions 🎉');
    expect(m.buttons).toBeUndefined();
  });

  it('uses Russian copy for ru', () => {
    expect(toBotLocale('ru')).toBe('ru');
    expect(toBotLocale(null)).toBe('en');
    expect(toBotLocale('de')).toBe('en');
    expect(
      questionListMessage('ru', [], 'https://x.test/ru/admin', now).text,
    ).toBe('Вопросов без ответа нет 🎉');
  });

  it('connectedMessage adds the role line', () => {
    expect(connectedMessage('en', 'Bob', true).text).toBe(
      "Done! Telegram is connected to the account <b>Bob</b>.\nI'll write about every new student question. /new shows the unanswered ones.",
    );
    expect(connectedMessage('en', 'Bob', false).text).toContain('when the coach answers');
  });

  it('infoMessage carries the profile button where needed', () => {
    expect(infoMessage('en', 'expired', 'https://x.test/p').buttons).toEqual([
      { text: 'Open profile', url: 'https://x.test/p' },
    ]);
    expect(infoMessage('en', 'help', 'https://x.test/p').buttons).toBeUndefined();
  });
});
