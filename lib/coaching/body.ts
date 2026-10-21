export const MAX_BODY_LENGTH = 4000;

// A textarea counts a line break as one character, but form submission sends
// it as "\r\n". Normalizing on both sides keeps the client counter and the
// server limit in agreement.
export function normalizeBody(raw: string): string {
  return raw.replace(/\r\n?/g, '\n');
}
