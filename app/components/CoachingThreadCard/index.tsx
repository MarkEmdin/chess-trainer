'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useFormatter, useTranslations } from 'next-intl';
import { ExternalLinkIcon } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import ChessboardContainer from '@/app/components/ChessboardContainer';
import SectionLabel from '@/app/components/SectionLabel';
import { sideToMove } from '@/lib/chess/fen';
import { formatVariation, playVariation } from '@/lib/chess/variation';
import type { CoachingMessage, CoachingThreadData } from '@/lib/coaching/types';

// The modal pulls in chess.js and the interactive board; load it only when
// the card is opened.
const CoachingModal = dynamic(() => import('@/app/components/CoachingModal'), {
  ssr: false,
});

export type CoachingThread = CoachingThreadData & {
  game_url: string;
  move_san: string;
};

type Props = {
  thread: CoachingThread;
};

export default function CoachingThreadCard({ thread }: Props) {
  const t = useTranslations('coaching');
  const format = useFormatter();
  const [open, setOpen] = useState(false);
  const createdAt = format.dateTime(new Date(thread.created_at), {
    dateStyle: 'medium',
  });

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <ChessboardContainer
            position={thread.fen}
            orientation={sideToMove(thread.fen)}
          />

          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-semibold text-foreground">
                {thread.move_san}
              </span>
              <span className="text-xs text-muted-foreground">{createdAt}</span>
            </div>

            <SectionLabel label={t('yourQuestion')}>
              <MessagePreview fen={thread.fen} message={thread} />
            </SectionLabel>

            <SectionLabel label={t('coachResponse')}>
              {thread.responses.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  {t('awaitingReply')}
                </p>
              ) : (
                thread.responses.map((r, i) => (
                  <MessagePreview key={i} fen={thread.fen} message={r} />
                ))
              )}
            </SectionLabel>

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => setOpen(true)}>
                {t('open')}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={thread.game_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLinkIcon className="size-4" />
                  {t('viewOnChessCom')}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {open && (
        <CoachingModal
          mode="student"
          fen={thread.fen}
          orientation={sideToMove(thread.fen)}
          moveLabel={thread.move_san}
          subtitle={createdAt}
          thread={thread}
          onClose={() => setOpen(false)}
        />
      )}
    </Card>
  );
}

// Message text plus its variation as one notation line. Stepping through the
// line happens in the modal.
export function MessagePreview({
  fen,
  message,
}: {
  fen: string;
  message: CoachingMessage;
}) {
  const played = message.variation
    ? playVariation(fen, message.variation)
    : null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm text-foreground whitespace-pre-wrap">
        {message.body}
      </p>
      {played && played.moves.length > 0 && (
        <p className="text-sm font-mono text-muted-foreground">
          {formatVariation(played.moves)}
        </p>
      )}
    </div>
  );
}
