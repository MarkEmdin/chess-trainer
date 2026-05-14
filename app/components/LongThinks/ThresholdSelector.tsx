'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';

const PRESETS = [15, 30, 45, 60, 90] as const;

type Props = {
  value: number;
  onChange: (next: number) => void;
};

export default function ThresholdSelector({ value, onChange }: Props) {
  const t = useTranslations('thinkTime');

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">
        {t('thresholdLabel')}:
      </span>
      {PRESETS.map((seconds) => (
        <Button
          key={seconds}
          variant={value === seconds ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(seconds)}
        >
          {t('secondsShort', { value: seconds })}
        </Button>
      ))}
    </div>
  );
}
