'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import FormField from '@/app/components/FormField';
import Spinner from '@/app/components/Spinner';
import {
  chooseNickname,
  type ProfileFormState,
} from '@/lib/auth/profileActions';

export default function ChooseNicknameForm() {
  const t = useTranslations('auth');
  const [state, formAction, pending] = useActionState<
    ProfileFormState,
    FormData
  >(chooseNickname, undefined);

  return (
    <div className="mx-auto my-12 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-6 rounded-[10px] border border-border bg-card px-6 py-8 sm:my-16">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          {t('chooseNickname.title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('chooseNickname.subtitle')}
        </p>
      </header>

      <form action={formAction} className="flex flex-col gap-4">
        <FormField
          label={t('nickname')}
          id="nickname"
          name="nickname"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
        />

        {state && 'error' in state && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending && <Spinner />}
          {pending ? t('chooseNickname.pending') : t('chooseNickname.submit')}
        </Button>
      </form>
    </div>
  );
}
