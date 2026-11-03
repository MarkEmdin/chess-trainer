'use client';

import { useActionState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import {
  approveApplication,
  rejectApplication,
  type ActionState,
} from '@/lib/coaches/actions';
import type { CoachTitle } from '@/lib/coaches/titles';
import { useCoachName } from '@/lib/coaches/useCoachName';
import Spinner from '@/app/components/Spinner';

export type PendingApplication = {
  id: string;
  nickname: string;
  created_at: string;
  first_name: string;
  last_name: string;
  title: CoachTitle;
  fide_id: string | null;
  chesscom_username: string | null;
  lichess_username: string | null;
  about: string;
};

// One coach application waiting for the admin's decision.
export default function ApplicationCard({
  application,
}: {
  application: PendingApplication;
}) {
  const t = useTranslations('coaches.manage');
  const format = useFormatter();
  const coachName = useCoachName();
  const [approved, approve, approving] = useActionState<ActionState, FormData>(
    approveApplication,
    undefined,
  );
  const [rejected, reject, rejecting] = useActionState<ActionState, FormData>(
    rejectApplication,
    undefined,
  );
  const error =
    (approved && 'error' in approved && approved.error) ||
    (rejected && 'error' in rejected && rejected.error);

  const details: [string, string | null][] = [
    [t('fideId'), application.fide_id],
    [t('chesscom'), application.chesscom_username],
    [t('lichess'), application.lichess_username],
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div>
          <h3 className="font-semibold text-foreground">
            {coachName(application)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('appliedBy', {
              nickname: application.nickname,
              date: format.dateTime(new Date(application.created_at), {
                dateStyle: 'medium',
              }),
            })}
          </p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {details
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-foreground break-all">{value}</dd>
              </div>
            ))}
        </dl>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{t('about')}</span>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {application.about}
          </p>
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <form action={approve}>
            <input type="hidden" name="application_id" value={application.id} />
            <Button type="submit" size="sm" disabled={approving || rejecting}>
              {approving && <Spinner />}
              {t('approve')}
            </Button>
          </form>
          <form action={reject}>
            <input type="hidden" name="application_id" value={application.id} />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={approving || rejecting}
            >
              {rejecting && <Spinner />}
              {t('reject')}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
