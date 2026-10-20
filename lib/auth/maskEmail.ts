// "alice@gmail.com" -> "a***@gmail.com": enough for the user to recognise
// their address on the check-email screen without echoing it in full.
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at < 1) return '***';
  return `${email[0]}***${email.slice(at)}`;
}
