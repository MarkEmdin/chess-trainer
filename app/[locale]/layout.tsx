import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import '@/app/globals.css';
import Header from '@/app/components/Header';
import ThemeProvider from '@/app/components/ThemeProvider';

const SITE_URL = 'https://chess-trainer-amber.vercel.app';
const BRAND = 'Chess Fundamentals';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="rose"
            themes={['light', 'dark', 'rose']}
            enableSystem={false}
            disableTransitionOnChange
          >
            <Header />
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
