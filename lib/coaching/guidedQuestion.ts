import {
  QUESTION_REASONS,
  type QuestionReason,
} from '@/app/constants/questionReasons';
import type { MessageContent, Segment } from './content';

// The three steps of the student's ask form (spec 039), joined into one
// ordinary message: the coach, previews and notifications see plain text
// with the step 1 chips, one line per filled step.

export type GuidedSteps = {
  candidates: MessageContent;
  reasons: QuestionReason[];
  question: string;
};

export type GuidedLabels = {
  candidates: string;
  reasons: string;
  question: string;
  reason: (r: QuestionReason) => string;
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function composeGuidedContent(
  { candidates, reasons, question }: GuidedSteps,
  labels: GuidedLabels,
): MessageContent {
  const segments: Segment[] = [];
  // Each filled step after the first starts on its own line.
  const label = (text: string): Segment => ({
    t: 'text',
    text: segments.length > 0 ? '\n' + text : text,
  });

  const hasCandidates = candidates.segments.some(
    (s) => s.t === 'moves' || s.text.trim() !== '',
  );
  if (hasCandidates) {
    segments.push(label(`${labels.candidates} `), ...candidates.segments);
  }

  const picked = QUESTION_REASONS.filter((r) => reasons.includes(r));
  if (picked.length > 0) {
    const list = picked.map((r) => lowerFirst(labels.reason(r))).join(', ');
    segments.push(label(`${labels.reasons} ${list}`));
  }

  const asked = question.trim();
  if (asked) segments.push(label(`${labels.question} ${asked}`));

  return { ...candidates, segments };
}
