import { createClient } from '@/lib/supabase/server';
import { telegramConfig } from './config';

// Whether to offer the bot right after a question (spec 015): only when it
// is configured, not yet linked, and not dismissed. A failed read hides the
// offer rather than failing the question that triggered it.
export async function shouldOfferTelegram(userId: string): Promise<boolean> {
  if (!telegramConfig()) return false;
  try {
    const supabase = await createClient();
    const [profile, link] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('telegram_prompt_dismissed')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('telegram_links')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);
    if (profile.error || link.error || !profile.data) return false;
    return !profile.data.telegram_prompt_dismissed && link.data === null;
  } catch {
    return false;
  }
}
