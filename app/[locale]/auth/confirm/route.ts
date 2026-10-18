import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Supabase's hosted verify endpoint redirects here with ?code=... after the
// user clicks the emailed reset link. Exchanging the code is what actually
// establishes the recovery session — the PKCE code_verifier cookie was set
// when `resetPasswordForEmail` ran, inside the `requestPasswordReset` action.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
