import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { getAuthedUser } from '@/lib/auth/getUser';
import LandingNickForm from '@/app/components/LandingNickForm';
import LineDemo from '@/app/components/LineDemo';
import {
  COACH_CHIPS,
  COACH_LINE,
  COACH_POSITION,
} from '@/app/constants/aboutExamples';

const steps = ['find', 'think', 'discuss'] as const;

export default async function Home() {
  // The landing is for guests; signed-in users go straight to the product
  // (spec 017).
  const user = await getAuthedUser();
  if (user) {
    redirect({ href: '/think-time', locale: await getLocale() });
  }

  const t = await getTranslations('home');
  const tAbout = await getTranslations('about');
  return (
    <main className="flex flex-col flex-1 bg-background font-sans">
      <div className="max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-16">
        <section className="grid items-center gap-8 md:grid-cols-2 md:gap-10">
          <div className="flex flex-col items-start gap-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              {t('headline')}
            </h1>
            <p className="text-lg text-muted-foreground">{t('subhead')}</p>
            <LandingNickForm />
          </div>
          <div className="relative mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg shadow-primary/5">
            <span className="absolute -top-3 right-3 z-10 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
              {t('demoLabel')}
            </span>
            <LineDemo
              line={COACH_LINE}
              start={COACH_POSITION.length}
              chips={COACH_CHIPS}
              text={[tAbout('features.demo.questions.answer'), 0]}
              hint={tAbout('features.demo.hint')}
              header={
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                  {tAbout('features.demo.questions.question')}
                </p>
              }
            />
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-semibold text-foreground">
            {t('howItWorks.title')}
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step} className="flex flex-col gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="font-medium text-foreground">
                  {t(`howItWorks.${step}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`howItWorks.${step}.text`)}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
