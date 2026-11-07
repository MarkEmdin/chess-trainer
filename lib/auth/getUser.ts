import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { isRole, type Role } from './roles';

export type AuthedUser = {
  id: string;
  email: string;
  nickname: string;
  nicknameSet: boolean;
  role: Role;
  preferredLocale: string | null;
};

// Returns the authenticated user (with profile fields joined) or null.
// Use from Server Components / layouts to render auth-aware UI.
// Cached per request (spec 021): Header, NotificationBell and the page all
// ask, and each uncached call is an Auth round trip plus a profile query.
export const getAuthedUser = cache(async (): Promise<AuthedUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, nickname, nickname_set, preferred_locale')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? '',
    nickname: profile?.nickname ?? '',
    nicknameSet: profile?.nickname_set ?? true,
    role: isRole(profile?.role) ? profile.role : 'user',
    preferredLocale: profile?.preferred_locale ?? null,
  };
});
