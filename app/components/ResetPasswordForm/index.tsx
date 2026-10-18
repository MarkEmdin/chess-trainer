'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/app/components/ui/button';
import FormField from '@/app/components/FormField';
import { updatePassword, type AuthFormState } from '@/lib/auth/actions';

export default function ResetPasswordForm() {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    updatePassword,
    undefined,
  );

  return (
    <div className="mx-auto w-full max-w-sm flex flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {t('resetPassword.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('resetPassword.subtitle')}
        </p>
      </header>

      {state && 'success' in state ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-sm text-foreground" role="status">
            {state.success}
          </p>
          <Link
            href="/login"
            className="text-foreground underline hover:no-underline"
          >
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <FormField
            label={t('resetPassword.newPassword')}
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />

          <FormField
            label={t('resetPassword.confirmPassword')}
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
          />

          {state && 'error' in state && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? t('resetPassword.pending') : t('resetPassword.submit')}
          </Button>
        </form>
      )}
    </div>
  );
}
