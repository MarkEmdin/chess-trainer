import { cookies } from 'next/headers';

// The address waiting for confirmation, so /check-email can show it and the
// resend action can use it without the email ever riding in a URL.
export const PENDING_EMAIL_COOKIE = 'pending_email';

export async function setPendingEmail(email: string): Promise<void> {
  (await cookies()).set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60,
  });
}

export async function getPendingEmail(): Promise<string | null> {
  return (await cookies()).get(PENDING_EMAIL_COOKIE)?.value ?? null;
}
