'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import CoachNameFields, {
  CoachField,
  type FieldErrors,
} from '@/app/components/CoachNameFields';
import { applyForCoach, type FormState } from '@/lib/coaches/actions';
import {
  MAX_ABOUT_LENGTH,
  MAX_HANDLE_LENGTH,
  type ApplicationFields,
} from '@/lib/coaches/application';

type Initial = Partial<Record<keyof ApplicationFields, string>>;

// "Become a coach" form (spec 020). Field errors come back from the server
// action and render under each field.
export default function CoachApplicationForm({
  initial,
}: {
  initial: Initial;
}) {
  const t = useTranslations('coaches.apply');
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    applyForCoach,
    undefined,
  );
  const errors: FieldErrors = state && 'errors' in state ? state.errors : {};
  const invalid = (key: string) =>
    errors[key]
      ? { 'aria-invalid': true, 'aria-describedby': `${key}-error` }
      : {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <CoachNameFields initial={initial} errors={errors} />

      <CoachField id="fide_id" label={t('fideId')} error={errors.fide_id}>
        <Input
          id="fide_id"
          name="fide_id"
          inputMode="numeric"
          maxLength={12}
          defaultValue={initial.fide_id ?? ''}
          {...invalid('fide_id')}
        />
      </CoachField>

      <div className="flex flex-col gap-1.5">
        <div className="grid gap-4 sm:grid-cols-2">
          {(['chesscom_username', 'lichess_username'] as const).map((key) => (
            <CoachField
              key={key}
              id={key}
              label={t(key === 'chesscom_username' ? 'chesscom' : 'lichess')}
              error={errors[key]}
            >
              <Input
                id={key}
                name={key}
                maxLength={MAX_HANDLE_LENGTH}
                autoCapitalize="none"
                spellCheck={false}
                defaultValue={initial[key] ?? ''}
                {...invalid(key)}
              />
            </CoachField>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t('accountsHint')}</p>
        {errors.accounts && (
          <p className="text-sm text-destructive">{errors.accounts}</p>
        )}
      </div>

      <CoachField
        id="about"
        label={t('about')}
        hint={t('aboutHint')}
        error={errors.about}
      >
        <Textarea
          id="about"
          name="about"
          rows={5}
          maxLength={MAX_ABOUT_LENGTH}
          defaultValue={initial.about ?? ''}
          {...invalid('about')}
        />
      </CoachField>

      {state && 'error' in state && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
