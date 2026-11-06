import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import LineDemo from '@/app/components/LineDemo';
import { buttonVariants } from '@/app/components/ui/button';
import {
  COACH_CHIPS,
  COACH_LINE,
  COACH_POSITION,
  MOVES_CHIPS,
  MOVES_LINE,
  MOVES_START,
} from '@/app/constants/aboutExamples';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('tutorial');
  return { title: t('metaTitle') };
}

const STEPS = [
  'find',
  'write',
  'moves',
  'continue',
  'newLine',
  'send',
] as const;
const PHONE_TIPS = ['keyboard', 'hide', 'send'] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function DemoFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg shadow-primary/5">
      {children}
    </div>
  );
}

export default async function TutorialPage() {
  const t = await getTranslations('tutorial');
  const about = await getTranslations('about');
  return (
    <main className="flex flex-col flex-1 bg-background font-sans">
      <div className="max-w-2xl mx-auto w-full px-6 py-12 flex flex-col gap-12">
        <header className="flex flex-col gap-3 rounded-2xl bg-linear-to-b from-primary/10 to-transparent p-6 sm:p-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="text-muted-foreground">{t('lead')}</p>
        </header>

        <Section title={t('ask.title')}>
          <ol className="flex flex-col gap-6">
            {STEPS.map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h3 className="font-medium text-foreground">
                    {t(`ask.steps.${step}.title`)}
                  </h3>
                  <p className="text-muted-foreground">
                    {t(`ask.steps.${step}.text`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground">{t('ask.demoIntro')}</p>
          <DemoFrame>
            <LineDemo
              line={MOVES_LINE}
              start={MOVES_START}
              chips={MOVES_CHIPS}
              text={[
                about('features.demo.moves.before'),
                0,
                about('features.demo.moves.middle'),
                1,
              ]}
              hint={about('features.demo.hint')}
              showCoordinates
            />
          </DemoFrame>
        </Section>

        <Section title={t('phone.title')}>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-muted-foreground">
            {PHONE_TIPS.map((tip) => (
              <li key={tip}>{t(`phone.tips.${tip}`)}</li>
            ))}
          </ul>
        </Section>

        <Section title={t('answer.title')}>
          <p className="text-muted-foreground">{t('answer.text')}</p>
          <DemoFrame>
            <LineDemo
              line={COACH_LINE}
              start={COACH_POSITION.length}
              chips={COACH_CHIPS}
              text={[about('features.demo.questions.answer'), 0]}
              hint={about('features.demo.hint')}
              header={
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                  {about('features.demo.questions.question')}
                </p>
              }
            />
          </DemoFrame>
          <p className="text-muted-foreground">{t('answer.notifications')}</p>
        </Section>

        <Section title={t('coach.title')}>
          <p className="text-muted-foreground">{t('coach.text')}</p>
        </Section>

        <Link
          href="/think-time"
          className={buttonVariants({
            size: 'lg',
            className: 'self-center',
          })}
        >
          {t('cta')}
        </Link>
      </div>
    </main>
  );
}
