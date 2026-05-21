import { createClient } from '@/lib/supabase/server';

export type AuthedUser = {
  id: string;
  email: string;
  nickname: string;
  role: 'user' | 'admin';
};

// Returns the authenticated user (with profile fields joined) or null.
// Use from Server Components / layouts to render auth-aware UI.
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, nickname')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? '',
    nickname: profile?.nickname ?? '',
    role: profile?.role ?? 'user',
  };
}
