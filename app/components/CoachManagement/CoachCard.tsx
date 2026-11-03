'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import {
  assignStudent,
  revokeCoach,
  unassignStudent,
  type ActionState,
} from '@/lib/coaches/actions';
import type { CoachProfile } from '@/lib/coaches/displayName';
import { useCoachName } from '@/lib/coaches/useCoachName';
import Spinner from '@/app/components/Spinner';

export type ManagedCoach = {
  id: string;
  nickname: string;
  profile: CoachProfile | null;
  students: { id: string; nickname: string }[];
};

function errorOf(state: ActionState): string | null {
  return state && 'error' in state ? state.error : null;
}

// A coach with their students: assign, unassign, revoke the role.
export default function CoachCard({ coach }: { coach: ManagedCoach }) {
  const t = useTranslations('coaches.manage');
  const coachName = useCoachName();
  const [assigned, assign, assigning] = useActionState<ActionState, FormData>(
    assignStudent,
    undefined,
  );
  const [unassigned, unassign] = useActionState<ActionState, FormData>(
    unassignStudent,
    undefined,
  );
  const [revoked, revoke, revoking] = useActionState<ActionState, FormData>(
    revokeCoach,
    undefined,
  );
  const [confirming, setConfirming] = useState(false);
  const error = errorOf(assigned) ?? errorOf(unassigned) ?? errorOf(revoked);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h3 className="font-semibold text-foreground">
            {coach.profile ? coachName(coach.profile) : `@${coach.nickname}`}
          </h3>
          {coach.profile && (
            <p className="text-sm text-muted-foreground">@{coach.nickname}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">
            {t('students', { count: coach.students.length })}
          </span>
          {coach.students.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noStudents')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {coach.students.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-foreground">@{s.nickname}</span>
                  <form action={unassign}>
                    <input type="hidden" name="student_id" value={s.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      {t('unassign')}
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form action={assign} className="flex flex-col gap-1.5">
          <label
            htmlFor={`assign-${coach.id}`}
            className="text-sm font-medium text-foreground"
          >
            {t('assignLabel')}
          </label>
          <input type="hidden" name="coach_id" value={coach.id} />
          <div className="flex gap-2">
            <Input
              id={`assign-${coach.id}`}
              name="nickname"
              required
              autoCapitalize="none"
              spellCheck={false}
              className="max-w-xs"
            />
            <Button type="submit" size="sm" disabled={assigning}>
              {assigning && <Spinner />}
              {t('assign')}
            </Button>
          </div>
        </form>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="border-t border-border pt-3">
          {confirming ? (
            <form action={revoke}>
              <input type="hidden" name="coach_id" value={coach.id} />
              <Button
                type="submit"
                size="sm"
                variant="destructive"
                disabled={revoking}
              >
                {revoking && <Spinner />}
                {t('revokeConfirm')}
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="hover:border-destructive/50"
              onClick={() => setConfirming(true)}
            >
              {t('revoke')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
