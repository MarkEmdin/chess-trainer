'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import CoachNameFields, {
  type FieldErrors,
} from '@/app/components/CoachNameFields';
import { saveMyCoachProfile, type FormState } from '@/lib/coaches/actions';
import Spinner from '@/app/components/Spinner';

// The admin's own signature under answers.
export default function MyCoachProfileForm({
  initial,
}: {
  initial: { first_name?: string; last_name?: string; title?: string };
}) {
  const t = useTranslations('coaches.manage');
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveMyCoachProfile,
    undefined,
  );
  const errors: FieldErrors = state && 'errors' in state ? state.errors : {};

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-xl">
      <p className="text-sm text-muted-foreground">{t('profileHint')}</p>
      <CoachNameFields initial={initial} errors={errors} />
      {state && 'error' in state && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state && 'success' in state && (
        <p className="text-sm text-foreground" role="status">
          {t('saved')}
        </p>
      )}
      <Button type="submit" disabled={pending} className="self-start">
        {pending && <Spinner />}
        {t('save')}
      </Button>
    </form>
  );
}
