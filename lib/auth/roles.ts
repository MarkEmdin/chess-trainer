// App roles (spec 020). `user` is a student; `coach` and `admin` are staff.
export type Role = 'user' | 'coach' | 'admin';

const ROLES: readonly Role[] = ['user', 'coach', 'admin'];

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

// Staff answer students' questions.
export function isStaff(role: Role): boolean {
  return role === 'coach' || role === 'admin';
}
