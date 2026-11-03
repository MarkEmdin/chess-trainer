'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { after } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { getAuthedUser, type AuthedUser } from '@/lib/auth/getUser';
import { isStaff } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_URL } from '@/lib/site';
import {
  notifyAdminsOfApplication,
  notifyApplicantOfDecision,
} from '@/lib/telegram/notify';
import {
  MAX_ABOUT_LENGTH,
  MAX_HANDLE_LENGTH,
  MAX_NAME_LENGTH,
  parseApplication,
  parseCoachProfile,
  type ApplicationErrors,
} from './application';

// Coach applications and management (spec 020). Applying goes through the
// signed-in user's client (RLS); every admin action checks the admin role
// and then writes with the service-role client.

export type ActionState = { error: string } | { success: true } | undefined;

export type FormState =
  | { errors: Partial<Record<string, string>> }
  | ActionState;

const MAX_BY_FIELD: Record<string, number> = {
  first_name: MAX_NAME_LENGTH,
  last_name: MAX_NAME_LENGTH,
  about: MAX_ABOUT_LENGTH,
  chesscom_username: MAX_HANDLE_LENGTH,
  lichess_username: MAX_HANDLE_LENGTH,
};

async function fieldErrors(
  errors: ApplicationErrors,
): Promise<{ errors: Partial<Record<string, string>> }> {
  const t = await getTranslations('coaches.apply.errors');
  return {
    errors: Object.fromEntries(
      Object.entries(errors).map(([field, code]) => [
        field,
        t(code, { max: MAX_BY_FIELD[field] ?? 0 }),
      ]),
    ),
  };
}

async function origin(): Promise<string> {
  return (await headers()).get('origin') ?? SITE_URL;
}

function refresh() {
  revalidatePath('/[locale]/admin/coaches', 'page');
  revalidatePath('/[locale]/admin', 'page');
  revalidatePath('/[locale]', 'layout');
}

// The admin, or the translated refusal.
async function requireAdmin(): Promise<AuthedUser | string> {
  const user = await getAuthedUser();
  if (user?.role === 'admin') return user;
  const t = await getTranslations('coaches.manage.errors');
  return t('notAdmin');
}

export async function applyForCoach(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = await getTranslations('coaches.apply.errors');
  const user = await getAuthedUser();
  if (!user) return { error: t('notAuthenticated') };
  if (isStaff(user.role)) return { error: t('alreadyCoach') };

  const parsed = parseApplication(formData);
  if (!parsed.ok) return fieldErrors(parsed.errors);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('coach_applications')
    .insert({ user_id: user.id, ...parsed.fields })
    .select('id')
    .single();
  if (error) {
    // 23505: the one-pending-per-user index.
    if (error.code === '23505') return { error: t('alreadyPending') };
    return { error: error.message };
  }

  const site = await origin();
  after(() => notifyAdminsOfApplication(data.id, site));
  revalidatePath('/[locale]/become-coach', 'page');
  revalidatePath('/[locale]', 'layout');
  return { success: true };
}

async function pendingApplication(id: string) {
  const { data } = await createAdminClient()
    .from('coach_applications')
    .select('id, user_id, first_name, last_name, title')
    .eq('id', id)
    .eq('status', 'pending')
    .maybeSingle();
  return data;
}

export async function approveApplication(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (typeof admin === 'string') return { error: admin };
  const t = await getTranslations('coaches.manage.errors');

  const app = await pendingApplication(String(formData.get('application_id')));
  if (!app) return { error: t('notFound') };

  const db = createAdminClient();
  const steps = await Promise.all([
    db
      .from('user_profiles')
      .update({ role: 'coach' })
      .eq('id', app.user_id)
      .eq('role', 'user'),
    db.from('coach_profiles').upsert(
      {
        user_id: app.user_id,
        first_name: app.first_name,
        last_name: app.last_name,
        title: app.title,
      },
      { onConflict: 'user_id' },
    ),
    // A coach can't be anyone's student.
    db.from('coach_students').delete().eq('student_id', app.user_id),
  ]);
  const failed = steps.find((s) => s.error);
  if (failed?.error) return { error: failed.error.message };

  const { error } = await db
    .from('coach_applications')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', app.id);
  if (error) return { error: error.message };

  const site = await origin();
  after(() => notifyApplicantOfDecision(app.user_id, true, site));
  refresh();
  return { success: true };
}

export async function rejectApplication(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (typeof admin === 'string') return { error: admin };
  const t = await getTranslations('coaches.manage.errors');

  const app = await pendingApplication(String(formData.get('application_id')));
  if (!app) return { error: t('notFound') };

  const { error } = await createAdminClient()
    .from('coach_applications')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', app.id);
  if (error) return { error: error.message };

  const site = await origin();
  after(() => notifyApplicantOfDecision(app.user_id, false, site));
  refresh();
  return { success: true };
}

// Escapes LIKE wildcards so ilike works as a case-insensitive equals.
function likeExact(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function assignStudent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (typeof admin === 'string') return { error: admin };
  const t = await getTranslations('coaches.manage.errors');

  const coachId = String(formData.get('coach_id') ?? '');
  const nickname = String(formData.get('nickname') ?? '').trim();
  const db = createAdminClient();

  const [{ data: coach }, { data: student }] = await Promise.all([
    db
      .from('user_profiles')
      .select('id')
      .eq('id', coachId)
      .eq('role', 'coach')
      .maybeSingle(),
    nickname
      ? db
          .from('user_profiles')
          .select('id, role')
          .ilike('nickname', likeExact(nickname))
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!coach) return { error: t('notFound') };
  if (!student) return { error: t('studentNotFound') };
  if (student.role !== 'user') return { error: t('notStudent') };

  const { error } = await db
    .from('coach_students')
    .upsert(
      { student_id: student.id, coach_id: coach.id },
      { onConflict: 'student_id' },
    );
  if (error) return { error: error.message };
  refresh();
  return { success: true };
}

export async function unassignStudent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (typeof admin === 'string') return { error: admin };

  const { error } = await createAdminClient()
    .from('coach_students')
    .delete()
    .eq('student_id', String(formData.get('student_id') ?? ''));
  if (error) return { error: error.message };
  refresh();
  return { success: true };
}

export async function revokeCoach(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (typeof admin === 'string') return { error: admin };

  const coachId = String(formData.get('coach_id') ?? '');
  const db = createAdminClient();
  // The coach profile stays: old answers keep their author's name.
  const steps = await Promise.all([
    db
      .from('user_profiles')
      .update({ role: 'user' })
      .eq('id', coachId)
      .eq('role', 'coach'),
    db.from('coach_students').delete().eq('coach_id', coachId),
  ]);
  const failed = steps.find((s) => s.error);
  if (failed?.error) return { error: failed.error.message };
  refresh();
  return { success: true };
}

// The admin's own public signature, so their answers are signed too.
export async function saveMyCoachProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  if (typeof admin === 'string') return { error: admin };

  const parsed = parseCoachProfile(formData);
  if (!parsed.ok) return fieldErrors(parsed.errors);

  const { error } = await createAdminClient()
    .from('coach_profiles')
    .upsert(
      { user_id: admin.id, ...parsed.fields },
      { onConflict: 'user_id' },
    );
  if (error) return { error: error.message };
  refresh();
  return { success: true };
}
