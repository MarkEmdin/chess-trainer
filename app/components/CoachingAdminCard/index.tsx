'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { ExternalLinkIcon } from 'lucide-react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import ChessboardWithNotation from '@/app/components/ChessboardWithNotation';
import CoachingResponseForm from '@/app/components/CoachingResponseForm';

export type AdminCoachingRequest = {
  id: string;
  user_nickname: string;
  game_url: string;
  fen: string;
  move_san: string;
  body: string;
  created_at: string;
  response: { body: string; created_at: string } | null;
};

type Props = {
  request: AdminCoachingRequest;
};

function sideToMove(fen: string): 'white' | 'black' {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white';
}

export default function CoachingAdminCard({ request }: Props) {
  const t = useTranslations('coachingAdmin');
  const tCoaching = useTranslations('coaching');
  const format = useFormatter();
  const askedAt = format.dateTime(new Date(request.created_at), {
    dateStyle: 'medium',
  });

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-[220px] mx-auto sm:w-[200px] sm:mx-0 sm:shrink-0 sm:self-start pointer-events-none">
            <ChessboardWithNotation
              position={request.fen}
              boardOrientation={sideToMove(request.fen)}
            />
          </div>

          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-semibold text-foreground">
                {request.move_san}
              </span>
              <span className="text-sm text-muted-foreground">
                {t('askedBy', { nickname: request.user_nickname })}
              </span>
              <span className="text-xs text-muted-foreground">
                {askedAt}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('question')}
              </span>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {request.body}
              </p>
            </div>

            {request.response ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('yourResponse')}
                </span>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {request.response.body}
                </p>
              </div>
            ) : (
              <CoachingResponseForm requestId={request.id} />
            )}

            <Button variant="outline" size="sm" asChild className="self-start">
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
      </CardContent>
    </Card>
  );
}
