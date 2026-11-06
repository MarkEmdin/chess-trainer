'use server';

import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyAdminsOfFeedback } from '@/lib/telegram/notify';
import {
  FEEDBACK_KINDS,
  MAX_CONTACT_LENGTH,
  MAX_FEEDBACK_LENGTH,
  type FeedbackKind,
} from './types';

export type FeedbackState = { success: true } | { error: string } | undefined;

const MAX_PAGE_LENGTH = 300;
const MAX_DEVICE_LENGTH = 200;
const MAX_PER_HOUR = 5;

function field(data: FormData, name: string): string {
  return String(data.get(name) ?? '').trim();
}

// Telegram is the only place a message lands, so a failed check lets it
// through: losing a real report is worse than one extra message.
async function underLimit(forwardedFor: string | null | undefined) {
  const address = forwardedFor?.split(',')[0].trim();
  if (!address) return true;
  const { data, error } = await createAdminClient().rpc('allow_feedback', {
    p_key: createHash('sha256').update(address).digest('hex'),
    p_limit: MAX_PER_HOUR,
  });
  return error ? true : data !== false;
}

export async function sendFeedback(
  _prev: FeedbackState,
  data: FormData,
): Promise<FeedbackState> {
  // Only a bot fills the hidden field; it gets no hint that it was caught.
  if (field(data, 'website')) return { success: true };

  const t = await getTranslations('feedback');
  const body = field(data, 'body');
  if (!body) return { error: t('errors.empty') };
  if (body.length > MAX_FEEDBACK_LENGTH) {
    return { error: t('errors.tooLong', { max: MAX_FEEDBACK_LENGTH }) };
  }

  const requestHeaders = await headers();
  if (!(await underLimit(requestHeaders.get('x-forwarded-for')))) {
    return { error: t('errors.tooMany') };
  }

  const kind = field(data, 'kind');
  const user = await getAuthedUser();
  const userAgent = requestHeaders.get('user-agent') ?? '';
  const delivered = await notifyAdminsOfFeedback({
    kind: FEEDBACK_KINDS.includes(kind as FeedbackKind)
      ? (kind as FeedbackKind)
      : 'bug',
    body,
    sender: user && { nickname: user.nickname, email: user.email },
    contact: field(data, 'contact').slice(0, MAX_CONTACT_LENGTH),
    page: field(data, 'page').slice(0, MAX_PAGE_LENGTH),
    device: [field(data, 'screen'), userAgent]
      .filter(Boolean)
      .join(', ')
      .slice(0, MAX_DEVICE_LENGTH),
  });
  return delivered ? { success: true } : { error: t('errors.failed') };
}
