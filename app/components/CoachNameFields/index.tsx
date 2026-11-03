'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/app/components/ui/input';
import { COACH_TITLES } from '@/lib/coaches/titles';
import { MAX_NAME_LENGTH } from '@/lib/coaches/application';
import { cn } from '@/lib/utils';

export type FieldErrors = Partial<Record<string, string>>;

// Label + control + inline error, for the coach forms (spec 020).
export function CoachField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// Shared by the application and the admin's own coach profile: first name,
// last name and title, as students see them under answers.
export default function CoachNameFields({
  initial,
  errors,
}: {
  initial: { first_name?: string; last_name?: string; title?: string };
  errors: FieldErrors;
}) {
  const t = useTranslations('coaches');
  const invalid = (key: string) =>
    errors[key]
      ? { 'aria-invalid': true, 'aria-describedby': `${key}-error` }
      : {};

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {(['first_name', 'last_name'] as const).map((key) => (
          <CoachField
            key={key}
            id={key}
            label={t(
              key === 'first_name' ? 'apply.firstName' : 'apply.lastName',
            )}
            error={errors[key]}
          >
            <Input
              id={key}
              name={key}
              defaultValue={initial[key] ?? ''}
              maxLength={MAX_NAME_LENGTH}
              autoComplete={key === 'first_name' ? 'given-name' : 'family-name'}
              {...invalid(key)}
            />
          </CoachField>
        ))}
      </div>
      <CoachField
        id="title"
        label={t('apply.title_field')}
        error={errors.title}
      >
        <select
          id="title"
          name="title"
          defaultValue={initial.title ?? 'none'}
          className={cn(
            'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-base md:text-sm',
            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none',
            'dark:bg-input/30',
          )}
          {...invalid('title')}
        >
          {COACH_TITLES.map((title) => (
            <option key={title} value={title} className="bg-background">
              {t(`titleOptions.${title}`)}
            </option>
          ))}
        </select>
      </CoachField>
    </>
  );
}
