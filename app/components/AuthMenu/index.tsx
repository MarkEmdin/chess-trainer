import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAuthedUser } from '@/lib/auth/getUser';
import { signOut } from '@/lib/auth/actions';

// Renders sign-in / sign-up links when anonymous; the user's email plus
// sign-out (and an admin-area link for admins) when authenticated. Lives
// in the Header — Server Component so the auth lookup happens once per
// request without round-tripping through the client.
export default async function AuthMenu() {
  const t = await getTranslations('auth');
  const user = await getAuthedUser();

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/login"
          className="hover:text-muted-foreground transition-colors"
        >
          {t('signIn')}
        </Link>
        <Link
          href="/register"
          className="hover:text-muted-foreground transition-colors"
        >
          {t('signUp')}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {user.role === 'admin' && (
        <Link
          href="/admin"
          className="hover:text-muted-foreground transition-colors"
        >
          {t('admin')}
        </Link>
      )}
      <Link
        href="/coaching"
        className="hover:text-muted-foreground transition-colors"
      >
        {t('myCoaching')}
      </Link>
      <Link
        href="/profile"
        className="text-muted-foreground hover:text-foreground transition-colors hidden lg:inline"
      >
        {user.nickname}
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          className="hover:text-muted-foreground transition-colors cursor-pointer"
        >
          {t('signOut')}
        </button>
      </form>
    </div>
  );
}
