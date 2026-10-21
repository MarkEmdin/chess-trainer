import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { buttonVariants } from '@/app/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/app/components/ui/card';

const steps = ['find', 'think', 'discuss'] as const;

const features = [
  { href: '/think-time', key: 'keyPositions' },
  { href: '/games', key: 'games' },
  { href: '/coaching', key: 'coaching' },
  { href: '/lessons', key: 'lessons' },
] as const;

export default async function Home() {
  const t = await getTranslations('home');
  return (
    <main className="flex flex-col flex-1 bg-background font-sans">
      <div className="max-w-4xl mx-auto w-full px-6 py-12 flex flex-col gap-16">
        <section className="flex flex-col items-center text-center gap-4">
          <div className="text-6xl">♔</div>
          <h1 className="text-4xl font-bold text-foreground">
            Chess Fundamentals
          </h1>
          <p className="text-lg text-foreground">{t('tagline')}</p>
          <p className="max-w-2xl text-muted-foreground">{t('idea')}</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/think-time" className={buttonVariants({ size: 'lg' })}>
              {t('ctaPrimary')}
            </Link>
            <Link
              href="/lessons"
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              {t('ctaSecondary')}
            </Link>
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

        <section className="flex flex-col gap-6">
          <h2 className="text-2xl font-semibold text-foreground">
            {t('features.title')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <Link key={feature.href} href={feature.href}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent>
                    <CardTitle>{t(`features.${feature.key}.title`)}</CardTitle>
                    <CardDescription className="mt-1">
                      {t(`features.${feature.key}.description`)}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t('future.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('future.description')}
          </p>
        </section>
      </div>
    </main>
  );
}
