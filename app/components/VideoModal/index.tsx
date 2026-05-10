'use client';

import { PlayIcon } from 'lucide-react';
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
  triggerLabel = 'Watch video',
}: VideoModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlayIcon />
          {triggerLabel}
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
