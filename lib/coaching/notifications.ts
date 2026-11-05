// What the header bell counts (spec 012).
import { isStaff, type Role } from '@/lib/auth/roles';

export type NotificationRow = {
  user_id: string;
  response_seen_at: string | null;
  coaching_responses: readonly unknown[];
};

export type NotificationCounts = {
  // The user's own answers they haven't opened yet.
  unseenAnswers: number;
  // Visible questions with no response yet; null for students.
  newQuestions: number | null;
  // Coach applications waiting for review; null for everyone but the admin.
  pendingApplications: number | null;
};

// An answer nobody opened. `undefined` means the read state wasn't loaded,
// which never counts as new.
export function isUnseen(thread: {
  responses: readonly unknown[];
  response_seen_at?: string | null;
}): boolean {
  return thread.responses.length > 0 && thread.response_seen_at === null;
}

export function formatBadgeCount(n: number): string | null {
  if (n <= 0) return null;
  return n > 9 ? '9+' : String(n);
}

// Staff read every request they may answer (RLS), so own answers are picked
// by `user_id`; staff's own questions aren't theirs to answer.
export function countNotifications(
  rows: readonly NotificationRow[],
  user: { id: string; role: Role },
): Omit<NotificationCounts, 'pendingApplications'> {
  const unseenAnswers = rows.filter(
    (r) =>
      r.user_id === user.id &&
      isUnseen({
        responses: r.coaching_responses,
        response_seen_at: r.response_seen_at,
      }),
  ).length;
  const newQuestions = isStaff(user.role)
    ? rows.filter(
        (r) => r.coaching_responses.length === 0 && r.user_id !== user.id,
      ).length
    : null;
  return { unseenAnswers, newQuestions };
}
