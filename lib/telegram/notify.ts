import { createAdminClient } from '@/lib/supabase/admin';
import type { Role } from '@/lib/auth/roles';
import { canSeeRequest } from '@/lib/coaches/visibility';
import { telegramConfig } from './config';
import { sendMessage, type BotMessage } from './api';
import { unlinkChat } from './link';
import {
  answeredMessage,
  applicationDecisionMessage,
  newApplicationMessage,
  newQuestionMessage,
  questionListMessage,
  toBotLocale,
  type BotLocale,
} from './messages';

async function deliver(chatId: number, msg: BotMessage): Promise<void> {
  const result = await sendMessage(chatId, msg);
  if (result === 'blocked') await unlinkChat(chatId);
}

type Db = ReturnType<typeof createAdminClient>;
type Recipient = { id: string; preferred_locale: string | null };

// Sends one message per linked recipient, in their own locale.
async function sendToLinked(
  db: Db,
  recipients: Recipient[],
  build: (locale: BotLocale) => BotMessage,
): Promise<void> {
  if (!recipients.length) return;
  const { data: links } = await db
    .from('telegram_links')
    .select('user_id, chat_id')
    .in(
      'user_id',
      recipients.map((r) => r.id),
    );
  await Promise.all(
    (links ?? []).map((link) =>
      deliver(
        link.chat_id,
        build(
          toBotLocale(
            recipients.find((r) => r.id === link.user_id)?.preferred_locale,
          ),
        ),
      ),
    ),
  );
}

// Student id -> coach id, for the visibility rule (spec 020).
async function coachMap(
  db: Db,
  studentIds?: string[],
): Promise<Map<string, string>> {
  const query = db.from('coach_students').select('student_id, coach_id');
  const { data } = await (studentIds
    ? query.in('student_id', studentIds)
    : query);
  return new Map(
    ((data ?? []) as { student_id: string; coach_id: string }[]).map((r) => [
      r.student_id,
      r.coach_id,
    ]),
  );
}

// A new question goes to every admin and to each coach who may answer it:
// the student's own coach, or every coach when the student has none.
export async function notifyStaffOfQuestion(
  requestId: string,
  origin: string,
): Promise<void> {
  if (!telegramConfig()) return;
  try {
    const db = createAdminClient();
    const { data: request } = await db
      .from('coaching_requests')
      .select('user_id, move_san, body')
      .eq('id', requestId)
      .maybeSingle();
    if (!request) return;

    const [{ data: asker }, { data: staff }, coachOf] = await Promise.all([
      db
        .from('user_profiles')
        .select('nickname')
        .eq('id', request.user_id)
        .maybeSingle(),
      db
        .from('user_profiles')
        .select('id, role, preferred_locale')
        .in('role', ['admin', 'coach'])
        .neq('id', request.user_id),
      coachMap(db, [request.user_id]),
    ]);
    const recipients = ((staff ?? []) as (Recipient & { role: Role })[]).filter(
      (p) => canSeeRequest(p, request.user_id, coachOf),
    );

    await sendToLinked(db, recipients, (locale) =>
      newQuestionMessage(locale, {
        nickname: asker?.nickname ?? '',
        moveSan: request.move_san,
        body: request.body,
        url: `${origin}/${locale}/admin?request=${requestId}`,
      }),
    );
  } catch (e) {
    console.error('telegram notifyStaffOfQuestion failed', e);
  }
}

export async function notifyStudentOfAnswer(
  requestId: string,
  origin: string,
): Promise<void> {
  if (!telegramConfig()) return;
  try {
    const db = createAdminClient();
    const { data: request } = await db
      .from('coaching_requests')
      .select('user_id, move_san')
      .eq('id', requestId)
      .maybeSingle();
    if (!request) return;

    const { data: link } = await db
      .from('telegram_links')
      .select('chat_id')
      .eq('user_id', request.user_id)
      .maybeSingle();
    if (!link) return;

    const { data: profile } = await db
      .from('user_profiles')
      .select('preferred_locale')
      .eq('id', request.user_id)
      .maybeSingle();
    const locale = toBotLocale(profile?.preferred_locale);

    await deliver(
      link.chat_id,
      answeredMessage(locale, {
        moveSan: request.move_san,
        url: `${origin}/${locale}/coaching?tab=answered`,
      }),
    );
  } catch (e) {
    console.error('telegram notifyStudentOfAnswer failed', e);
  }
}

// Unanswered questions the viewer may answer, oldest first, for the bot's
// /new command. Throws on DB errors: the webhook decides how to answer.
export async function unansweredList(
  origin: string,
  locale: BotLocale,
  now: Date,
  viewer: { id: string; role: Role },
): Promise<BotMessage> {
  const db = createAdminClient();
  const [{ data, error }, coachOf] = await Promise.all([
    db
      .from('coaching_requests')
      .select('id, user_id, move_san, created_at, coaching_responses(id)')
      .order('created_at', { ascending: true }),
    coachMap(db),
  ]);
  if (error) throw new Error(error.message);

  const open = (data ?? []).filter(
    (r) =>
      r.coaching_responses.length === 0 &&
      canSeeRequest(viewer, r.user_id, coachOf),
  );
  const { data: profiles } = open.length
    ? await db
        .from('user_profiles')
        .select('id, nickname')
        .in(
          'id',
          open.map((r) => r.user_id),
        )
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.nickname]));

  return questionListMessage(
    locale,
    open.map((r) => ({
      nickname: names.get(r.user_id) ?? '',
      moveSan: r.move_san,
      createdAt: r.created_at,
      url: `${origin}/${locale}/admin?request=${r.id}`,
    })),
    `${origin}/${locale}/admin`,
    now,
  );
}

// A new coach application goes to every admin (spec 020).
export async function notifyAdminsOfApplication(
  applicationId: string,
  origin: string,
): Promise<void> {
  if (!telegramConfig()) return;
  try {
    const db = createAdminClient();
    const { data: app } = await db
      .from('coach_applications')
      .select('user_id, first_name, last_name')
      .eq('id', applicationId)
      .maybeSingle();
    if (!app) return;
    const [{ data: applicant }, { data: admins }] = await Promise.all([
      db
        .from('user_profiles')
        .select('nickname')
        .eq('id', app.user_id)
        .maybeSingle(),
      db
        .from('user_profiles')
        .select('id, preferred_locale')
        .eq('role', 'admin'),
    ]);
    await sendToLinked(db, (admins ?? []) as Recipient[], (locale) =>
      newApplicationMessage(locale, {
        nickname: applicant?.nickname ?? '',
        name: `${app.first_name} ${app.last_name}`,
        url: `${origin}/${locale}/admin/coaches`,
      }),
    );
  } catch (e) {
    console.error('telegram notifyAdminsOfApplication failed', e);
  }
}

// The admin approved or rejected an application (spec 020).
export async function notifyApplicantOfDecision(
  userId: string,
  approved: boolean,
  origin: string,
): Promise<void> {
  if (!telegramConfig()) return;
  try {
    const db = createAdminClient();
    const { data: profile } = await db
      .from('user_profiles')
      .select('id, preferred_locale')
      .eq('id', userId)
      .maybeSingle();
    if (!profile) return;
    await sendToLinked(db, [profile as Recipient], (locale) =>
      applicationDecisionMessage(locale, {
        approved,
        url: `${origin}/${locale}/${approved ? 'admin' : 'become-coach'}`,
      }),
    );
  } catch (e) {
    console.error('telegram notifyApplicantOfDecision failed', e);
  }
}
