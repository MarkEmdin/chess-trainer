// What held the student back, picked with one tap in the ask form (spec 039).
// Labels live in messages under `coaching.guided.reasons.<id>`.
export const QUESTION_REASONS = [
  'noPlan',
  'threat',
  'calculation',
  'choice',
] as const;

export type QuestionReason = (typeof QUESTION_REASONS)[number];

export function isQuestionReason(v: unknown): v is QuestionReason {
  return (QUESTION_REASONS as readonly unknown[]).includes(v);
}
