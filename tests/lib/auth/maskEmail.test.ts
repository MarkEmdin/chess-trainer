import { maskEmail } from '@/lib/auth/maskEmail';

describe('maskEmail', () => {
  it('keeps the first letter and the domain', () => {
    expect(maskEmail('alice@gmail.com')).toBe('a***@gmail.com');
  });

  it('masks a one-letter local part the same way', () => {
    expect(maskEmail('a@x.io')).toBe('a***@x.io');
  });

  it('hides everything when there is no @', () => {
    expect(maskEmail('nonsense')).toBe('***');
  });
});
