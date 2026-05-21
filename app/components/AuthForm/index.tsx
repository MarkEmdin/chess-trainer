'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { signIn, signUp, type AuthFormState } from '@/lib/auth/actions';

type Props = {
  mode: 'login' | 'register';
};

export default function AuthForm({ mode }: Props) {
  const t = useTranslations('auth');
  const action = mode === 'login' ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    undefined,
  );

  const otherMode = mode === 'login' ? 'register' : 'login';

  return (
    <div className="mx-auto w-full max-w-sm flex flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {t(`${mode}.title`)}
        </h1>
        <p className="text-sm text-muted-foreground">{t(`${mode}.subtitle`)}</p>
      </header>

      <form action={formAction} className="flex flex-col gap-4">
        {mode === 'register' && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              {t('email')}
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="nickname"
            className="text-sm font-medium text-foreground"
          >
            {t('nickname')}
          </label>
          <Input
            id="nickname"
            name="nickname"
            type="text"
            autoComplete="username"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground"
          >
            {t('password')}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
            minLength={6}
            required
          />
        </div>

        {state?.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
            {state.suggest === 'register' && (
              <>
                {' '}
                <Link
                  href="/register"
                  className="text-foreground underline hover:no-underline"
                >
                  {t('errors.registerSuggest')}
                </Link>
              </>
            )}
            {state.suggest === 'login' && (
              <>
                {' '}
                <Link
                  href="/login"
                  className="text-foreground underline hover:no-underline"
                >
                  {t('errors.loginSuggest')}
                </Link>
              </>
            )}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? t(`${mode}.pending`) : t(`${mode}.submit`)}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground text-center">
        {t(`${mode}.switchPrompt`)}{' '}
        <Link
          href={otherMode === 'login' ? '/login' : '/register'}
          className="text-foreground underline hover:no-underline"
        >
          {t(`${otherMode}.switchLink`)}
        </Link>
      </p>
    </div>
  );
}
