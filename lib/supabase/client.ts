'use client';

import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client. Reads session cookies set by the server
// helpers below — never holds long-lived state, safe to call per-component.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
