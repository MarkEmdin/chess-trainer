'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import {
  QUESTION_REASONS,
  type QuestionReason,
} from '@/app/constants/questionReasons';

type Props = {
  value: QuestionReason[];
  onChange: (next: QuestionReason[]) => void;
};

// Step 2 of the student's ask form (spec 039): what held them back, any
// number of one-tap answers.
export default function ReasonPicker({ value, onChange }: Props) {
  const t = useTranslations('coaching.guided');
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm font-medium text-foreground">
        {t('reasonsLabel')}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex flex-wrap gap-2"
      >
        {QUESTION_REASONS.map((r) => {
          const on = value.includes(r);
          return (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={on ? 'default' : 'outline'}
              aria-pressed={on}
              onClick={() =>
                onChange(on ? value.filter((v) => v !== r) : [...value, r])
              }
            >
              {t(`reasons.${r}`)}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
