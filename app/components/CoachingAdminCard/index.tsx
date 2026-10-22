'use client';

import { useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { useFormatter, useTranslations } from 'next-intl';
import { ExternalLinkIcon } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import ChessboardContainer from '@/app/components/ChessboardContainer';
import { MessagePreview } from '@/app/components/CoachingThreadCard';
import SectionLabel from '@/app/components/SectionLabel';
import { sideToMove } from '@/lib/chess/fen';
import type { CoachingThreadData } from '@/lib/coaching/types';

const CoachingModal = dynamic(() => import('@/app/components/CoachingModal'), {
  ssr: false,
});

const noSubscribe = () => () => {};

export type AdminCoachingRequest = CoachingThreadData & {
  user_nickname: string;
  game_url: string;
  move_san: string;
};

type Props = {
  request: AdminCoachingRequest;
};

export default function CoachingAdminCard({ request }: Props) {
  const t = useTranslations('coachingAdmin');
  const tCoaching = useTranslations('coaching');
  const format = useFormatter();
  const [open, setOpen] = useState(false);
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
    <Card>
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
              <span className="text-sm text-muted-foreground">
                {t('askedAt', { date: when(request.created_at) })}
              </span>
            </div>

            <SectionLabel label={t('question')}>
              <MessagePreview fen={request.fen} message={request} />
            </SectionLabel>

            {answered && (
              <SectionLabel label={t('yourResponse')}>
                {request.responses.map((r, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      {t('answeredAt', { date: when(r.created_at) })}
                    </span>
                    <MessagePreview fen={request.fen} message={r} />
                  </div>
                ))}
              </SectionLabel>
            )}

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
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  );
}
