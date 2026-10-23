import type { MessageContent } from './content';

// One message in a coaching thread: the student's question or the coach's
// answer. `variation` is an optional SAN line from the thread's `fen`
// (older messages); `content` is an inline-editor message (spec 011), whose
// `body` is its plain-text rendering.
export type CoachingMessage = {
  body: string;
  created_at: string;
  variation: string[] | null;
  content?: MessageContent | null;
};

export type CoachingThreadData = CoachingMessage & {
  id: string;
  fen: string;
  // 1-based half-move played from `fen`; locates the key position in `pgn`.
  move_index: number;
  // Whole game, when it was saved with the question (null for older ones).
  pgn: string | null;
  responses: CoachingMessage[];
};
