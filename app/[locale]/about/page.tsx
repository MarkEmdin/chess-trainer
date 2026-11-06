import type { ComponentType, ReactNode } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  BellIcon,
  BookOpenIcon,
  MessageSquareWarningIcon,
  SwordsIcon,
  ThumbsUpIcon,
  TimerIcon,
  TrophyIcon,
} from 'lucide-react';
import ExampleBoard from '@/app/components/ExampleBoard';
import LineDemo from '@/app/components/LineDemo';
import { Card, CardContent } from '@/app/components/ui/card';
import {
  COACH_CHIPS,
  COACH_LINE,
  COACH_POSITION,
  KEY_POSITION,
  MOVES_CHIPS,
  MOVES_LINE,
  MOVES_START,
} from '@/app/constants/aboutExamples';
import { CONTACT_EMAIL, REPO_URL } from '@/lib/site';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('about');
  return { title: t('metaTitle') };
}

const MORE_FEATURES: {
  id: 'games' | 'notifications' | 'leaderboard' | 'learning' | 'feedback';
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: 'games', icon: SwordsIcon },
  { id: 'notifications', icon: BellIcon },
  { id: 'leaderboard', icon: TrophyIcon },
  { id: 'learning', icon: BookOpenIcon },
  { id: 'feedback', icon: MessageSquareWarningIcon },
];

const linkClass =
  'font-medium text-primary underline-offset-4 hover:underline';

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

// A feature in words next to its board. `flip` swaps the sides on wide screens.
function Showcase({
  title,
  text,
  flip = false,
  children,
}: {
  title: string;
  text: string;
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
      <div className={cn('flex flex-col gap-2', flip && 'md:order-2')}>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-muted-foreground">{text}</p>
      </div>
      <div className="relative mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-3 shadow-lg shadow-primary/5">
        {children}
      </div>
    </div>
  );
}

export default async function AboutPage() {
  const t = await getTranslations('about');
  const item = (id: string) => ({
    title: t(`features.items.${id}.title`),
    text: t(`features.items.${id}.text`),
  });
  return (
    <main className="flex flex-col flex-1 bg-background font-sans">
      <div className="max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-16">
        <header className="flex flex-col gap-8 rounded-2xl bg-linear-to-b from-primary/10 to-transparent p-6 sm:p-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {t('title')}
          </h1>
          <Section title={t('why.title')}>
            <p className="text-muted-foreground">{t('why.p1')}</p>
            <p className="text-muted-foreground">{t('why.p2')}</p>
          </Section>
        </header>

        <section className="flex flex-col gap-12">
          <h2 className="text-2xl font-semibold text-foreground">
            {t('features.title')}
          </h2>

          <Showcase {...item('positions')}>
            <span className="absolute -top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
              <TimerIcon className="size-3.5" />
              {t('features.demo.positions.badge')}
            </span>
            <ExampleBoard moves={KEY_POSITION} />
          </Showcase>

          <Showcase {...item('moves')} flip>
            <LineDemo
              line={MOVES_LINE}
              start={MOVES_START}
              chips={MOVES_CHIPS}
              text={[
                t('features.demo.moves.before'),
                0,
                t('features.demo.moves.middle'),
                1,
              ]}
              hint={t('features.demo.hint')}
              showCoordinates
            />
          </Showcase>

          <Showcase {...item('questions')}>
            <LineDemo
              line={COACH_LINE}
              start={COACH_POSITION.length}
              chips={COACH_CHIPS}
              text={[t('features.demo.questions.answer'), 0]}
              hint={t('features.demo.hint')}
              header={
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                  {t('features.demo.questions.question')}
                </p>
              }
              footer={
                <span className="inline-flex items-center gap-1 text-xs text-primary">
                  <ThumbsUpIcon className="size-3.5 fill-primary" />
                  {t('features.demo.questions.liked')}
                </span>
              }
            />
          </Showcase>

          <div className="grid gap-4 sm:grid-cols-2">
            {MORE_FEATURES.map(({ id, icon: Icon }) => (
              <Card key={id} className="last:sm:col-span-2">
                <CardContent className="flex gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="flex flex-col gap-1">
                    <h3 className="font-medium text-foreground">
                      {item(id).title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item(id).text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="max-w-2xl flex flex-col gap-10">
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
      </div>
    </main>
  );
}
