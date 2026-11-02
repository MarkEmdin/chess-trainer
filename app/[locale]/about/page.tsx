import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CONTACT_EMAIL, REPO_URL } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about');
  return { title: t('metaTitle') };
}

const linkClass =
  'font-medium text-primary underline-offset-4 hover:underline';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function AboutPage() {
  const t = await getTranslations('about');
  return (
    <main className="flex flex-col flex-1 bg-background font-sans">
      <div className="max-w-2xl mx-auto w-full px-6 py-12 flex flex-col gap-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          {t('title')}
        </h1>

        <Section title={t('why.title')}>
          <p className="text-muted-foreground">{t('why.p1')}</p>
          <p className="text-muted-foreground">{t('why.p2')}</p>
        </Section>

        <Section title={t('author.title')}>
          <p className="text-muted-foreground">{t('author.text')}</p>
        </Section>

        <Section title={t('contact.title')}>
          <p className="text-muted-foreground">
            {t('contact.text')}{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </Section>

        <Section title={t('source.title')}>
          <p className="text-muted-foreground">
            {t('source.text')}{' '}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              {t('source.link')}
            </a>
          </p>
        </Section>
      </div>
    </main>
  );
}
