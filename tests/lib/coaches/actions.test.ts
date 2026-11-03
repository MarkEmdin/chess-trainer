import {
  applyForCoach,
  approveApplication,
  assignStudent,
  rejectApplication,
  revokeCoach,
  saveMyCoachProfile,
  unassignStudent,
} from '@/lib/coaches/actions';
import { createFakeDb, type FakeDb } from './fakeDb';

let userDb: FakeDb;
let adminDb: FakeDb;

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ from: (t: string) => userDb.from(t) }),
}));
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: (t: string) => adminDb.from(t) }),
}));

const getAuthedUser = jest.fn();
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: () => getAuthedUser(),
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/server', () => ({
  after: (fn: () => unknown) => void fn(),
}));
jest.mock('next/headers', () => ({
  headers: async () => ({ get: () => 'https://site.test' }),
}));
jest.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => (key: string) =>
    `${namespace}.${key}`,
}));

const notifyAdminsOfApplication = jest.fn();
const notifyApplicantOfDecision = jest.fn();
jest.mock('@/lib/telegram/notify', () => ({
  notifyAdminsOfApplication: (...a: unknown[]) =>
    notifyAdminsOfApplication(...a),
  notifyApplicantOfDecision: (...a: unknown[]) =>
    notifyApplicantOfDecision(...a),
}));

const admin = { id: 'admin1', role: 'admin' };
const student = { id: 'u1', role: 'user' };

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const application = {
  first_name: 'Ivan',
  last_name: 'Petrov',
  title: 'IM',
  fide_id: '4100018',
  chesscom_username: 'ivan',
  lichess_username: '',
  about: 'I coach juniors.',
};

beforeEach(() => {
  userDb = createFakeDb();
  adminDb = createFakeDb();
  notifyAdminsOfApplication.mockReset();
  notifyApplicantOfDecision.mockReset();
  getAuthedUser.mockResolvedValue(admin);
  adminDb.tables = {
    user_profiles: [
      { id: 'admin1', nickname: 'Mark', role: 'admin' },
      { id: 'u1', nickname: 'Kid', role: 'user' },
      { id: 'c1', nickname: 'CoachA', role: 'coach' },
      { id: 'c2', nickname: 'CoachB', role: 'coach' },
    ],
    coach_applications: [
      { id: 'app1', user_id: 'u1', status: 'pending', ...application },
    ],
    coach_students: [],
  };
});

describe('applyForCoach', () => {
  it('stores a pending application and tells the admins', async () => {
    getAuthedUser.mockResolvedValue(student);
    const result = await applyForCoach(undefined, form(application));
    expect(result).toEqual({ success: true });
    expect(userDb.writes).toEqual([
      {
        table: 'coach_applications',
        op: 'insert',
        value: {
          user_id: 'u1',
          first_name: 'Ivan',
          last_name: 'Petrov',
          title: 'IM',
          fide_id: '4100018',
          chesscom_username: 'ivan',
          lichess_username: null,
          about: 'I coach juniors.',
        },
      },
    ]);
    expect(notifyAdminsOfApplication).toHaveBeenCalledWith(
      'new-id',
      'https://site.test',
    );
  });

  it('returns translated field errors', async () => {
    getAuthedUser.mockResolvedValue(student);
    const result = await applyForCoach(
      undefined,
      form({ ...application, first_name: '', chesscom_username: '' }),
    );
    expect(result).toEqual({
      errors: {
        first_name: 'coaches.apply.errors.required',
        accounts: 'coaches.apply.errors.needAccount',
      },
    });
    expect(userDb.writes).toEqual([]);
  });

  it('refuses a second application while one is pending', async () => {
    getAuthedUser.mockResolvedValue(student);
    userDb.insertError = { code: '23505', message: 'dup' };
    expect(await applyForCoach(undefined, form(application))).toEqual({
      error: 'coaches.apply.errors.alreadyPending',
    });
  });

  it('refuses staff', async () => {
    getAuthedUser.mockResolvedValue({ id: 'c1', role: 'coach' });
    expect(await applyForCoach(undefined, form(application))).toEqual({
      error: 'coaches.apply.errors.alreadyCoach',
    });
  });

  it('refuses a signed-out visitor', async () => {
    getAuthedUser.mockResolvedValue(null);
    expect(await applyForCoach(undefined, form(application))).toEqual({
      error: 'coaches.apply.errors.notAuthenticated',
    });
  });
});

describe('admin actions', () => {
  it.each([
    [
      'approveApplication',
      () => approveApplication(undefined, form({ application_id: 'app1' })),
    ],
    [
      'rejectApplication',
      () => rejectApplication(undefined, form({ application_id: 'app1' })),
    ],
    [
      'assignStudent',
      () => assignStudent(undefined, form({ coach_id: 'c1', nickname: 'Kid' })),
    ],
    [
      'unassignStudent',
      () => unassignStudent(undefined, form({ student_id: 'u1' })),
    ],
    ['revokeCoach', () => revokeCoach(undefined, form({ coach_id: 'c1' }))],
    [
      'saveMyCoachProfile',
      () => saveMyCoachProfile(undefined, form(application)),
    ],
  ])('%s refuses a coach', async (_name, call) => {
    getAuthedUser.mockResolvedValue({ id: 'c1', role: 'coach' });
    expect(await call()).toEqual({ error: 'coaches.manage.errors.notAdmin' });
    expect(adminDb.writes).toEqual([]);
  });
});

describe('approveApplication', () => {
  it('makes the applicant a coach with a public profile', async () => {
    adminDb.tables.coach_students = [{ student_id: 'u1', coach_id: 'c1' }];
    const result = await approveApplication(
      undefined,
      form({ application_id: 'app1' }),
    );
    expect(result).toEqual({ success: true });
    expect(adminDb.tables.user_profiles[1].role).toBe('coach');
    expect(adminDb.writes).toContainEqual({
      table: 'coach_profiles',
      op: 'upsert',
      value: {
        user_id: 'u1',
        first_name: 'Ivan',
        last_name: 'Petrov',
        title: 'IM',
      },
    });
    expect(adminDb.tables.coach_students).toEqual([]);
    expect(adminDb.tables.coach_applications[0].status).toBe('approved');
    expect(adminDb.tables.coach_applications[0].reviewed_at).toEqual(
      expect.any(String),
    );
    expect(notifyApplicantOfDecision).toHaveBeenCalledWith(
      'u1',
      true,
      'https://site.test',
    );
  });

  it('ignores an application that is no longer pending', async () => {
    adminDb.tables.coach_applications[0].status = 'rejected';
    expect(
      await approveApplication(undefined, form({ application_id: 'app1' })),
    ).toEqual({ error: 'coaches.manage.errors.notFound' });
    expect(adminDb.tables.user_profiles[1].role).toBe('user');
  });
});

describe('rejectApplication', () => {
  it('marks the application rejected and tells the applicant', async () => {
    expect(
      await rejectApplication(undefined, form({ application_id: 'app1' })),
    ).toEqual({ success: true });
    expect(adminDb.tables.coach_applications[0].status).toBe('rejected');
    expect(adminDb.tables.user_profiles[1].role).toBe('user');
    expect(notifyApplicantOfDecision).toHaveBeenCalledWith(
      'u1',
      false,
      'https://site.test',
    );
  });
});

describe('assignStudent', () => {
  it('assigns a student to the coach by nickname, case-insensitively', async () => {
    expect(
      await assignStudent(
        undefined,
        form({ coach_id: 'c1', nickname: ' kid ' }),
      ),
    ).toEqual({ success: true });
    expect(adminDb.writes).toContainEqual({
      table: 'coach_students',
      op: 'upsert',
      value: { student_id: 'u1', coach_id: 'c1' },
    });
  });

  it('reports an unknown nickname', async () => {
    expect(
      await assignStudent(
        undefined,
        form({ coach_id: 'c1', nickname: 'nobody' }),
      ),
    ).toEqual({ error: 'coaches.manage.errors.studentNotFound' });
  });

  it('does not treat % as a wildcard', async () => {
    expect(
      await assignStudent(undefined, form({ coach_id: 'c1', nickname: 'K%' })),
    ).toEqual({ error: 'coaches.manage.errors.studentNotFound' });
  });

  it('refuses to assign a coach or the admin as a student', async () => {
    expect(
      await assignStudent(
        undefined,
        form({ coach_id: 'c1', nickname: 'CoachB' }),
      ),
    ).toEqual({ error: 'coaches.manage.errors.notStudent' });
    expect(
      await assignStudent(
        undefined,
        form({ coach_id: 'c1', nickname: 'Mark' }),
      ),
    ).toEqual({ error: 'coaches.manage.errors.notStudent' });
  });

  it('refuses a target that is not a coach', async () => {
    expect(
      await assignStudent(undefined, form({ coach_id: 'u1', nickname: 'Kid' })),
    ).toEqual({ error: 'coaches.manage.errors.notFound' });
  });
});

describe('unassignStudent', () => {
  it('removes the assignment', async () => {
    adminDb.tables.coach_students = [{ student_id: 'u1', coach_id: 'c1' }];
    expect(
      await unassignStudent(undefined, form({ student_id: 'u1' })),
    ).toEqual({ success: true });
    expect(adminDb.tables.coach_students).toEqual([]);
  });
});

describe('revokeCoach', () => {
  it('makes the coach a student again and frees their students', async () => {
    adminDb.tables.coach_students = [
      { student_id: 'u1', coach_id: 'c1' },
      { student_id: 'u9', coach_id: 'c2' },
    ];
    expect(await revokeCoach(undefined, form({ coach_id: 'c1' }))).toEqual({
      success: true,
    });
    expect(adminDb.tables.user_profiles[2].role).toBe('user');
    expect(adminDb.tables.coach_students).toEqual([
      { student_id: 'u9', coach_id: 'c2' },
    ]);
  });

  it('never demotes the admin', async () => {
    await revokeCoach(undefined, form({ coach_id: 'admin1' }));
    expect(adminDb.tables.user_profiles[0].role).toBe('admin');
  });
});

describe('saveMyCoachProfile', () => {
  it("upserts the admin's own coach profile", async () => {
    expect(
      await saveMyCoachProfile(
        undefined,
        form({ first_name: 'Mark', last_name: 'Emdin', title: 'none' }),
      ),
    ).toEqual({ success: true });
    expect(adminDb.writes).toContainEqual({
      table: 'coach_profiles',
      op: 'upsert',
      value: {
        user_id: 'admin1',
        first_name: 'Mark',
        last_name: 'Emdin',
        title: 'none',
      },
    });
  });

  it('validates the fields', async () => {
    expect(
      await saveMyCoachProfile(
        undefined,
        form({ first_name: '', last_name: 'Emdin', title: 'none' }),
      ),
    ).toEqual({
      errors: { first_name: 'coaches.apply.errors.required' },
    });
  });
});
