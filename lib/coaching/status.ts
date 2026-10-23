// Where the student stands with the coach on one position.
export type ThreadStatus = 'none' | 'asked' | 'answered';

export function threadStatus(thread?: {
  responses: readonly unknown[];
}): ThreadStatus {
  if (!thread) return 'none';
  return thread.responses.length > 0 ? 'answered' : 'asked';
}
