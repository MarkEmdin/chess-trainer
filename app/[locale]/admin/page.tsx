import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getAuthedUser } from '@/lib/auth/getUser';

export default async function AdminPage() {
  const user = await getAuthedUser();
  if (!user || user.role !== 'admin') redirect('/');

  const t = await getTranslations('admin');

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
      <p className="text-muted-foreground">
        {t('signedInAs', { nickname: user.nickname })}
      </p>
    </main>
  );
}
