import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Types our email templates send. Anything else (invite, magic link, a
// hand-edited URL) is treated as a dead link.
const OTP_TYPES = ['email', 'recovery'] as const;
type OtpType = (typeof OTP_TYPES)[number];

function isOtpType(value: string | null): value is OtpType {
  return OTP_TYPES.includes(value as OtpType);
}

// Emailed links land here in one of two shapes:
// - ?token_hash=…&type=… from our own templates. verifyOtp needs no
//   browser state, so the link works on any device.
// - ?code=… from Supabase's default templates (PKCE). The code_verifier
//   cookie only exists in the browser that requested the email; kept for
//   links already sitting in inboxes.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');
  const rawNext = searchParams.get('next');
  // Only accept an absolute-path next (never an absolute URL/scheme) — the
  // param is attacker-editable since it rides on an emailed link.
  const safeNext = rawNext && rawNext.startsWith('/') ? rawNext : null;
  const next = safeNext ?? `/${locale}`;

  // Google sends the user back here with ?error= when they cancel.
  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/${locale}/login?error=google_failed`,
    );
  }

  if (tokenHash) {
    if (isOtpType(type)) {
      const supabase = await createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error('verifyOtp failed:', error.message);
    }
  } else if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (safeNext) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
      // No next means a Google sign-in. Metadata can't be passed through
      // OAuth, so the language is stored here instead of by the trigger.
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('nickname_set, preferred_locale')
        .eq('id', data.user.id)
        .single();
      if (profile && !profile.preferred_locale) {
        await supabase
          .from('user_profiles')
          .update({ preferred_locale: locale })
          .eq('id', data.user.id);
      }
      const home = profile?.preferred_locale ?? locale;
      return NextResponse.redirect(
        profile?.nickname_set === false
          ? `${origin}/${home}/choose-nickname`
          : `${origin}/${home}`,
      );
    }
    console.error('exchangeCodeForSession failed:', error.message);
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=link_expired`);
}
