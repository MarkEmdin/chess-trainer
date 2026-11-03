import { isRole, isStaff } from '@/lib/auth/roles';

describe('isStaff', () => {
  it('is false for a student', () => {
    expect(isStaff('user')).toBe(false);
  });
  it('is true for coach and admin', () => {
    expect(isStaff('coach')).toBe(true);
    expect(isStaff('admin')).toBe(true);
  });
});

describe('isRole', () => {
  it('accepts the three roles', () => {
    expect(['user', 'coach', 'admin'].every(isRole)).toBe(true);
  });
  it('rejects anything else', () => {
    expect(isRole('owner')).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});
