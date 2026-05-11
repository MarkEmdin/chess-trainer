'use client';

import { PlayIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import YouTubePlayer from '../YouTubePlayer';

type VideoModalProps = {
  url: string;
  title: string;
  triggerLabel?: string;
};

export default function VideoModal({
  url,
  title,
  triggerLabel,
}: VideoModalProps) {
  const t = useTranslations('videoModal');
  const label = triggerLabel ?? t('watchVideo');
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlayIcon />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <YouTubePlayer url={url} title={title} />
      </DialogContent>
    </Dialog>
  );
}
