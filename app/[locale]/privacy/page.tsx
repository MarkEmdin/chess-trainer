import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import PageLayout from '@/app/components/PageLayout';
import { CONTACT_EMAIL } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('privacy');
  return { title: t('metaTitle') };
}

const SECTIONS = ['data', 'use', 'sharing', 'browser', 'removal'] as const;

export default async function PrivacyPage() {
  const t = await getTranslations('privacy');

  return (
    <PageLayout title={t('title')} subtitle={t('updated')} maxWidth="2xl">
      <div className="flex flex-col gap-6">
        {SECTIONS.map((id) => (
          <section key={id} className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {t(`sections.${id}.title`)}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t(`sections.${id}.body`)}
            </p>
          </section>
        ))}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
      </div>
    </PageLayout>
  );
}
