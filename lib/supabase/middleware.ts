import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

// Refreshes the Supabase auth cookie on the given response if the access
// token is close to expiry. Called from proxy.ts alongside next-intl so both
// middlewares write to the same NextResponse — no fighting over cookies.
//
// Calling `supabase.auth.getUser()` is what triggers the refresh: the SDK
// inspects the existing cookie, swaps in a fresh access token if needed,
// and stages the new cookie via `setAll` below.
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}
