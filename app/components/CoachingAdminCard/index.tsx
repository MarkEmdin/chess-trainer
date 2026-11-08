'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useFormatter, useTranslations } from 'next-intl';
import { ExternalLinkIcon } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import ChessboardContainer from '@/app/components/ChessboardContainer';
import { MessagePreview } from '@/app/components/CoachingThreadCard';
import SectionLabel from '@/app/components/SectionLabel';
import ResponseLikeToggle from '@/app/components/ResponseLikeToggle';
import { sideToMove } from '@/lib/chess/fen';
import type { CoachingThreadData } from '@/lib/coaching/types';
import type { CoachProfile } from '@/lib/coaches/displayName';
import { useAnswerLabels, useCoachName } from '@/lib/coaches/useCoachName';
import { tapToOpen } from '@/lib/tapToOpen';

const CoachingModal = dynamic(() => import('@/app/components/CoachingModal'), {
  ssr: false,
});

const noSubscribe = () => () => {};

export type AdminCoachingRequest = CoachingThreadData & {
  user_nickname: string;
  game_url: string;
  move_san: string;
  // Spec 020: the asker is the viewing coach's own student.
  my_student?: boolean;
  // Spec 020, admin only: the asker's coach, when they have one.
  assigned_coach?: CoachProfile | null;
};

type Props = {
  request: AdminCoachingRequest;
  autoOpen?: boolean;
  // The signed-in staff member, to tell their own answers apart.
  viewerId?: string;
};

export default function CoachingAdminCard({
  request,
  autoOpen,
  viewerId,
}: Props) {
  const t = useTranslations('coachingAdmin');
  const tCoaches = useTranslations('coaches');
  const coachName = useCoachName();
  const answerLabels = useAnswerLabels();
  const tCoaching = useTranslations('coaching');
  const format = useFormatter();
  const [open, setOpen] = useState(autoOpen ?? false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoOpen) ref.current?.scrollIntoView({ block: 'center' });
  }, [autoOpen]);
  // Date and time, in the coach's own time zone. The server doesn't know
  // that zone, so its HTML carries only the date and the time appears once
  // hydrated; rendering both on the server would mismatch on hydration.
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const when = (iso: string) =>
    format.dateTime(
      new Date(iso),
      hydrated
        ? {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }
        : { dateStyle: 'medium', timeZone: 'UTC' },
    );
  const answered = request.responses.length > 0;

  return (
    <Card
      ref={ref}
      onClick={tapToOpen(() => setOpen(true))}
      className="cursor-pointer transition-colors hover:border-foreground/20"
    >
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <ChessboardContainer
            position={request.fen}
            orientation={sideToMove(request.fen)}
          />

          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-semibold text-foreground">
                {request.move_san}
              </span>
              <span className="text-sm text-muted-foreground">
                {t('askedBy', { nickname: request.user_nickname })}
              </span>
              {request.my_student && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                  {tCoaches('myStudent')}
                </span>
              )}
              {request.assigned_coach && (
                <span className="text-sm text-muted-foreground">
                  {tCoaches('coachOf', {
                    name: coachName(request.assigned_coach),
                  })}
                </span>
              )}
              <span className="text-sm text-muted-foreground">
                {t('askedAt', { date: when(request.created_at) })}
              </span>
            </div>

            <SectionLabel label={t('question')}>
              <MessagePreview fen={request.fen} message={request} />
            </SectionLabel>

            {request.responses.map((r, i) => (
              <SectionLabel key={i} label={answerLabels.forStaff(r, viewerId)}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t('answeredAt', { date: when(r.created_at) })}
                    </span>
                    {r.id && (
                      <ResponseLikeToggle
                        responseId={r.id}
                        liked={r.liked !== false}
                      />
                    )}
                  </div>
                  <MessagePreview fen={request.fen} message={r} />
                </div>
              </SectionLabel>
            ))}

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => setOpen(true)}>
                {answered ? tCoaching('open') : t('reply')}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={request.game_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon className="size-4" />
                  {tCoaching('openGame')}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {open && (
        <CoachingModal
          mode="coach"
          fen={request.fen}
          orientation={sideToMove(request.fen)}
          moveLabel={request.move_san}
          subtitle={t('askedBy', { nickname: request.user_nickname })}
          thread={request}
          game={
            request.pgn
              ? { pgn: request.pgn, moveIndex: request.move_index }
              : undefined
          }
          gameUrl={request.game_url}
          viewerId={viewerId}
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  );
}
