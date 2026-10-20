'use client';

import { useState } from 'react';
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
  const askedAt = format.dateTime(new Date(request.created_at), {
    dateStyle: 'medium',
  });
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
              <span className="text-xs text-muted-foreground">{askedAt}</span>
            </div>

            <SectionLabel label={t('question')}>
              <MessagePreview fen={request.fen} message={request} />
            </SectionLabel>

            {answered && (
              <SectionLabel label={t('yourResponse')}>
                {request.responses.map((r, i) => (
                  <MessagePreview key={i} fen={request.fen} message={r} />
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
                  {tCoaching('viewOnChessCom')}
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
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  );
}
