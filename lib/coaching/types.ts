// One message in a coaching thread: the student's question or the coach's
// answer. `variation` is an optional SAN line from the thread's `fen`.
export type CoachingMessage = {
  body: string;
  created_at: string;
  variation: string[] | null;
};

export type CoachingThreadData = CoachingMessage & {
  id: string;
  fen: string;
  responses: CoachingMessage[];
};
