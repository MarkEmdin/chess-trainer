import createIntlMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intl = createIntlMiddleware(routing);

// Compose two middlewares onto one response: next-intl handles locale
// detection / redirects first; then Supabase reads the same request and
// stages any session-cookie refresh onto the response next-intl returned.
// Doing it in this order means a redirect produced by next-intl still
// carries the refreshed auth cookie.
export default async function middleware(request: NextRequest) {
  const response = intl(request);
  return updateSession(request, response);
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
