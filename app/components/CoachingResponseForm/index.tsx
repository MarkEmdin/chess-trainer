'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import {
  respondToRequest,
  type RespondState,
} from '@/lib/coaching/actions';

type Props = {
  requestId: string;
};

// Admin-only response form. Mounts inside CoachingAdminCard when no
// response exists yet; once submitted, revalidatePath in the action
// makes the parent server component re-render with the response read-
// only, and this form unmounts.
export default function CoachingResponseForm({ requestId }: Props) {
  const t = useTranslations('coachingAdmin');
  const [state, formAction, pending] = useActionState<RespondState, FormData>(
    respondToRequest,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="request_id" value={requestId} />
      <Textarea
        name="body"
        rows={4}
        required
        minLength={1}
        maxLength={4000}
        placeholder={t('responsePlaceholder')}
        className="resize-y"
      />

      {state && 'error' in state && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? t('sending') : t('send')}
        </Button>
      </div>
    </form>
  );
}
