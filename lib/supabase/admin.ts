import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Admin client using the service_role key. BYPASSES RLS — use only from
// server-side code (Server Actions, route handlers). Never import this
// from any module that ships to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
