'use client';

import {
  chipLabel,
  type MessageContent,
  type MoveSegment,
} from '@/lib/coaching/content';
import { cn } from '@/lib/utils';
import { CHIP_CLASS } from './moveChip';

type Props = {
  fen: string;
  content: MessageContent;
  // Index of the chip whose line the board is showing, if any.
  activeChip: number | null;
  onChipClick: (segment: MoveSegment, index: number) => void;
};

// A sent inline-editor message: text with clickable move chips.
export default function MessageContentView({
  fen,
  content,
  activeChip,
  onChipClick,
}: Props) {
  return (
    <p className="text-sm leading-7 text-foreground whitespace-pre-wrap">
      {content.segments.map((segment, i) =>
        segment.t === 'text' ? (
          <span key={i}>{segment.text}</span>
        ) : (
          <button
            key={i}
            type="button"
            className={cn(
              CHIP_CLASS,
              activeChip === i && 'ring-2 ring-primary',
            )}
            onClick={() => onChipClick(segment, i)}
          >
            {chipLabel(
              fen,
              content.lines[segment.line],
              segment.from,
              segment.to,
            )}
          </button>
        ),
      )}
    </p>
  );
}
