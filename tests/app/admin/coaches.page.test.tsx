import { render, screen } from '@testing-library/react';
import CoachesPage from '@/app/[locale]/admin/coaches/page';

const redirect = jest.fn();
jest.mock('@/i18n/navigation', () => ({
  redirect: (...a: unknown[]) => redirect(...a),
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
jest.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations:
    async (namespace: string) =>
    (key: string, values?: Record<string, unknown>) =>
      values
        ? `${namespace}.${key}(${Object.values(values).join(',')})`
        : `${namespace}.${key}`,
}));

let user: { id: string; role: string } | null = { id: 'admin1', role: 'admin' };
jest.mock('@/lib/auth/getUser', () => ({
  getAuthedUser: async () => user,
}));

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {
  coach_applications: [
    {
      id: 'app1',
      user_id: 'u2',
      status: 'pending',
      created_at: '2026-11-03T10:00:00Z',
      first_name: 'Ivan',
      last_name: 'Petrov',
      title: 'IM',
      fide_id: null,
      chesscom_username: 'ivan',
      lichess_username: null,
      about: 'Hi',
    },
  ],
  user_profiles: [
    { id: 'admin1', nickname: 'Mark', role: 'admin' },
    { id: 'c1', nickname: 'coachA', role: 'coach' },
    { id: 's1', nickname: 'kid', role: 'user' },
    { id: 'u2', nickname: 'applicant', role: 'user' },
  ],
  coach_profiles: [
    { user_id: 'c1', first_name: 'Anna', last_name: 'Ivanova', title: 'WFM' },
    {
      user_id: 'admin1',
      first_name: 'Mark',
      last_name: 'Emdin',
      title: 'none',
    },
  ],
  coach_students: [{ student_id: 's1', coach_id: 'c1' }],
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      let rows = [...(tables[table] ?? [])];
      const b = {
        select: () => b,
        eq: (k: string, v: unknown) => {
          rows = rows.filter((r) => r[k] === v);
          return b;
        },
        in: (k: string, vs: unknown[]) => {
          rows = rows.filter((r) => vs.includes(r[k]));
          return b;
        },
        order: () => b,
        then: (resolve: (v: unknown) => void) => resolve({ data: rows }),
      };
      return b;
    },
  }),
}));

jest.mock('@/app/components/PageLayout', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));
jest.mock('@/app/components/CoachManagement', () => ({
  ApplicationCard: ({ application }: { application: Row }) => (
    <div>application {String(application.nickname)}</div>
  ),
  CoachCard: ({
    coach,
  }: {
    coach: { nickname: string; students: { nickname: string }[] };
  }) => (
    <div>
      coach {coach.nickname} students{' '}
      {coach.students.map((s) => s.nickname).join(',')}
    </div>
  ),
  MyCoachProfileForm: ({ initial }: { initial: Row }) => (
    <div>profile {String(initial.first_name)}</div>
  ),
}));

const page = (tab?: string) =>
  CoachesPage({
    params: Promise.resolve({ locale: 'en' }),
    searchParams: Promise.resolve(tab ? { tab } : {}),
  });

beforeEach(() => {
  user = { id: 'admin1', role: 'admin' };
  redirect.mockReset();
});

describe('admin coaches page', () => {
  it('sends a coach away', async () => {
    user = { id: 'c1', role: 'coach' };
    await page();
    expect(redirect).toHaveBeenCalledWith({ href: '/', locale: 'en' });
  });

  it('opens on pending applications with their nicknames', async () => {
    render(await page());
    expect(screen.getByText('application applicant')).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'coaches.manage.tabs.applications(1)' }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('lists coaches with their students', async () => {
    render(await page('coaches'));
    expect(screen.getByText('coach coachA students kid')).toBeInTheDocument();
  });

  it("prefills the admin's own coach profile", async () => {
    render(await page('profile'));
    expect(screen.getByText('profile Mark')).toBeInTheDocument();
  });
});
