import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Supabase's hosted verify endpoint redirects here with ?code=... after the
// user clicks the emailed reset link. Exchanging the code is what actually
// establishes the recovery session — the PKCE code_verifier cookie was set
// when `resetPasswordForEmail` ran, inside the `requestPasswordReset` action.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next');
  // Only accept an absolute-path next (never an absolute URL/scheme) — the
  // param is attacker-editable since it rides on an emailed link.
  const next = rawNext && rawNext.startsWith('/') ? rawNext : `/${locale}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('exchangeCodeForSession failed:', error.message);
  }

  return NextResponse.redirect(`${origin}/${locale}/login`);
}
