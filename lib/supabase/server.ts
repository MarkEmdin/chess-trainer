import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side Supabase client for Server Components, Server Actions, and
// Route Handlers. Reads/writes the auth cookie via Next.js' cookie store.
//
// In Server Components the cookie store is read-only (setAll throws);
// catching the error is safe because the middleware refreshes session
// cookies on every navigation.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components can't mutate cookies — middleware will
            // refresh on the next request.
          }
        },
      },
    },
  );
}
