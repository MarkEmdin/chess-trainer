'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/app/components/ui/button';
import FormField from '@/app/components/FormField';
import { requestPasswordReset, type AuthFormState } from '@/lib/auth/actions';

export default function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordReset,
    undefined,
  );

  return (
    <div className="mx-auto w-full max-w-sm flex flex-col gap-6 px-4 py-12">
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
            label={t('nickname')}
            id="nickname"
            name="nickname"
            type="text"
            autoComplete="username"
            required
          />

          {state && 'error' in state && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending}>
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
