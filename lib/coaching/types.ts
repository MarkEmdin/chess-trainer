import type { CoachProfile } from '@/lib/coaches/displayName';
import type { MessageContent } from './content';

// One message in a coaching thread: the student's question or the coach's
// answer. `variation` is an optional SAN line from the thread's `fen`
// (older messages); `content` is an inline-editor message (spec 011), whose
// `body` is its plain-text rendering.
export type CoachingMessage = {
  // Answers only: row id and whether staff liked it (default true). Absent
  // on questions and when not loaded.
  id?: string;
  liked?: boolean;
  body: string;
  created_at: string;
  variation: string[] | null;
  content?: MessageContent | null;
  // Answers only (spec 020): who wrote it, and their public coach profile
  // (null when they have none). Absent on questions and when not loaded.
  author_id?: string | null;
  author?: CoachProfile | null;
};

export type CoachingThreadData = CoachingMessage & {
  id: string;
  fen: string;
  // 1-based half-move played from `fen`; locates the key position in `pgn`.
  move_index: number;
  // Whole game, when it was saved with the question (null for older ones).
  pgn: string | null;
  responses: CoachingMessage[];
  // When the student first opened the answer (spec 012); absent if not loaded.
  response_seen_at?: string | null;
};
