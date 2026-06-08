'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import FormField from '@/app/components/FormField';
import {
  updateExternalUsernames,
  type ProfileFormState,
} from '@/lib/auth/profileActions';

type Props = {
  initial: {
    chesscom: string;
    lichess: string;
  };
};

export default function ProfileForm({ initial }: Props) {
  const t = useTranslations('profile');
  const [state, formAction, pending] = useActionState<
    ProfileFormState,
    FormData
  >(updateExternalUsernames, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField
        label={t('chesscom')}
        id="chesscom_username"
        name="chesscom_username"
        type="text"
        defaultValue={initial.chesscom}
        placeholder="MarkEmdin"
        autoCapitalize="none"
        spellCheck={false}
      />

      <FormField
        label={t('lichess')}
        id="lichess_username"
        name="lichess_username"
        type="text"
        defaultValue={initial.lichess}
        placeholder="mark_emdin"
        autoCapitalize="none"
        spellCheck={false}
      />

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
        {pending ? t('saving') : t('save')}
      </Button>
    </form>
  );
}
