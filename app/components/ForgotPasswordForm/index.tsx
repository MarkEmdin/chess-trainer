'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/app/components/ui/button';
import FormField from '@/app/components/FormField';
import { requestPasswordReset, type AuthFormState } from '@/lib/auth/actions';
import Spinner from '@/app/components/Spinner';

export default function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    undefined,
  );

  return (
    <div className="mx-auto my-12 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-6 rounded-[10px] border border-border bg-card px-6 py-8 sm:my-16">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {t('forgotPassword.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('forgotPassword.subtitle')}
        </p>
      </header>

      {state && 'success' in state ? (
        <p className="text-sm text-foreground text-center" role="status">
          {state.success}
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <FormField
            label={t('email')}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />

          {state && 'error' in state && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {pending ? t('forgotPassword.pending') : t('forgotPassword.submit')}
          </Button>
        </form>
      )}

      <p className="text-sm text-muted-foreground text-center">
        <Link
          href="/login"
          className="text-foreground underline hover:no-underline"
        >
          {t('forgotPassword.backToLogin')}
        </Link>
      </p>
    </div>
  );
}
