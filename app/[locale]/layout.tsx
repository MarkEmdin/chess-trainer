import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '@/app/globals.css';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import ThemeProvider from '@/app/components/ThemeProvider';
import { SITE_URL } from '@/lib/site';

const BRAND = 'Chess Fundamentals';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Lets `dvh` follow the phone keyboard, so the coaching modal's board can
// shrink and stay visible while typing. iOS Safari ignores this.
export const viewport: Viewport = { interactiveWidget: 'resizes-content' };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const description = t('description');
  const path = `/${locale}`;
  const ogLocale = locale === 'ru' ? 'ru_RU' : 'en_US';
  const altLocale = locale === 'ru' ? 'en_US' : 'ru_RU';

  return {
    metadataBase: new URL(SITE_URL),
    title: BRAND,
    description,
    applicationName: BRAND,
    authors: [{ name: 'Mark Emdin' }],
    creator: 'Mark Emdin',
    alternates: {
      canonical: path,
      languages: { en: '/en', ru: '/ru' },
    },
    openGraph: {
      type: 'website',
      url: path,
      siteName: BRAND,
      title: BRAND,
      description,
      locale: ogLocale,
      alternateLocale: [altLocale],
    },
    twitter: {
      card: 'summary_large_image',
      title: BRAND,
      description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col pb-16 sm:pb-0">
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            // One dark theme for now (spec 017); more themes come back later.
            forcedTheme="dark"
            defaultTheme="dark"
            themes={['dark']}
            enableSystem={false}
            disableTransitionOnChange
          >
            <Header />
            {/* Grows to fill the screen so short pages keep the footer at
                the bottom (spec 021). */}
            <div className="flex flex-1 flex-col">{children}</div>
            <Footer />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
