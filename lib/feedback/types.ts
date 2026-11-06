export const FEEDBACK_KINDS = ['bug', 'idea', 'inconvenient'] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const MAX_FEEDBACK_LENGTH = 2000;
export const MAX_CONTACT_LENGTH = 100;

export type Feedback = {
  kind: FeedbackKind;
  body: string;
  // null for a guest.
  sender: { nickname: string; email: string } | null;
  contact: string;
  page: string;
  device: string;
};
