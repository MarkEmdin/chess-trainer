import en from '@/messages/en.json';
import ru from '@/messages/ru.json';

function keyPaths(node: object, prefix = ''): string[] {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keyPaths(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}

describe('messages', () => {
  it('en and ru messages have identical key trees', () => {
    expect(keyPaths(ru).sort()).toEqual(keyPaths(en).sort());
  });
});
