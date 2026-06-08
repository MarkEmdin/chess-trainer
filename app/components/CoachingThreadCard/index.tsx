'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { ExternalLinkIcon } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import ChessboardContainer from '@/app/components/ChessboardContainer';
import SectionLabel from '@/app/components/SectionLabel';
import { sideToMove } from '@/lib/chess/fen';

export type CoachingThread = {
  id: string;
  game_url: string;
  fen: string;
  move_san: string;
  body: string;
  created_at: string;
  responses: { body: string; created_at: string }[];
};

type Props = {
  thread: CoachingThread;
};

export default function CoachingThreadCard({ thread }: Props) {
  const t = useTranslations('coaching');
  const format = useFormatter();
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
              <span className="text-xs text-muted-foreground">
                {createdAt}
              </span>
            </div>

            <SectionLabel label={t('yourQuestion')}>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {thread.body}
              </p>
            </SectionLabel>

            <SectionLabel label={t('coachResponse')}>
              {thread.responses.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  {t('awaitingReply')}
                </p>
              ) : (
                thread.responses.map((r, i) => (
                  <p
                    key={i}
                    className="text-sm text-foreground whitespace-pre-wrap"
                  >
                    {r.body}
                  </p>
                ))
              )}
            </SectionLabel>

            <Button variant="outline" size="sm" asChild className="self-start">
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
      </CardContent>
    </Card>
  );
}
