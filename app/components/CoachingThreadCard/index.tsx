'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Chessboard } from 'react-chessboard';
import { ExternalLinkIcon } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';

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

// Pick the side to render the board from — second token of the FEN
// after the position is "w" or "b" and tells us whose move it is. We
// orient the board so the side to move is at the bottom (matches what
// the user saw when they thought about the position).
function sideToMove(fen: string): 'white' | 'black' {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white';
}

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
          <div className="w-[200px] mx-auto sm:w-[160px] sm:mx-0 sm:shrink-0 sm:self-start pointer-events-none">
            <Chessboard
              options={{
                position: thread.fen,
                boardOrientation: sideToMove(thread.fen),
                allowDragging: false,
                showNotation: false,
                showAnimations: false,
              }}
            />
          </div>

          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-semibold text-foreground">
                {thread.move_san}
              </span>
              <span className="text-xs text-muted-foreground">
                {createdAt}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('yourQuestion')}
              </span>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {thread.body}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('coachResponse')}
              </span>
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
            </div>

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
