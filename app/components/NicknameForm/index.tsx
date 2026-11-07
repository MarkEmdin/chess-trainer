'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import FormField from '@/app/components/FormField';
import Spinner from '@/app/components/Spinner';
import {
  updateNickname,
  type ProfileFormState,
} from '@/lib/auth/profileActions';

type Props = {
  nickname: string;
};

export default function NicknameForm({ nickname }: Props) {
  const t = useTranslations('profile');
  const [state, formAction, pending] = useActionState<
    ProfileFormState,
    FormData
  >(updateNickname, undefined);

  return (
    <form action={formAction} className="mb-8 flex flex-col gap-4">
      <FormField
        label={t('nickname')}
        id="nickname"
        name="nickname"
        type="text"
        defaultValue={nickname}
        autoCapitalize="none"
        spellCheck={false}
        required
      />

      {state && 'error' in state && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state && 'success' in state && (
        <p className="text-sm text-foreground" role="status">
          {t('nicknameSaved')}
        </p>
      )}

      <Button type="submit" className="self-start" disabled={pending}>
        {pending && <Spinner />}
        {t('nicknameSave')}
      </Button>
    </form>
  );
}
