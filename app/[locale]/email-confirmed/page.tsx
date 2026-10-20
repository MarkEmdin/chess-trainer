import { Link, redirect } from '@/i18n/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';
import { routing } from '@/i18n/routing';

// Where the confirmation email lands once /auth/confirm has verified the
// token. Emails are English-only, so the link always says /en — switch to
// the user's saved language here, the same way login does.
export default async function EmailConfirmedPage() {
  const locale = await getLocale();
  const user = await getAuthedUser();
  if (!user) {
    return redirect({ href: '/login', locale });
  }

  const preferred = user.preferredLocale;
  if (
    preferred &&
    preferred !== locale &&
    routing.locales.includes(preferred as (typeof routing.locales)[number])
  ) {
    return redirect({ href: '/email-confirmed', locale: preferred });
  }

  const t = await getTranslations('auth.emailConfirmed');
  return (
    <div className="mx-auto w-full max-w-sm flex flex-col gap-6 px-4 py-12 text-center">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('body')}</p>
      </header>
      <Link
        href="/lessons"
        className="inline-block self-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {t('cta')}
      </Link>
    </div>
  );
}
