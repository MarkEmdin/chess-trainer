'use server';

import { headers } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
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

function field(data: FormData, name: string): string {
  return String(data.get(name) ?? '').trim();
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

  const kind = field(data, 'kind');
  const user = await getAuthedUser();
  const userAgent = (await headers()).get('user-agent') ?? '';
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
