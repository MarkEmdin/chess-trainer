'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/app/components/ui/button';
import { resendConfirmation, type AuthFormState } from '@/lib/auth/actions';
import Spinner from '@/app/components/Spinner';

type Props = {
  maskedEmail: string;
};

export default function CheckEmail({ maskedEmail }: Props) {
  const t = useTranslations('auth.checkEmail');
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    resendConfirmation,
    undefined,
  );

  return (
    <div className="mx-auto my-12 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-6 rounded-[10px] border border-border bg-card px-6 py-8 sm:my-16">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('body', { email: maskedEmail })}
        </p>
        <p className="text-sm text-muted-foreground">{t('spamHint')}</p>
      </header>

      <form action={formAction} className="flex flex-col gap-4">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending && <Spinner />}
          {pending ? t('resendPending') : t('resend')}
        </Button>

        {state && 'success' in state && (
          <p className="text-sm text-foreground text-center" role="status">
            {state.success}
          </p>
        )}
        {state && 'error' in state && (
          <p className="text-sm text-destructive text-center" role="alert">
            {state.error}
          </p>
        )}
      </form>

      <p className="text-sm text-muted-foreground text-center">
        <Link
          href="/login"
          className="text-foreground underline hover:no-underline"
        >
          {t('backToLogin')}
        </Link>
      </p>
    </div>
  );
}
