import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister';
import { SessionProvider } from 'next-auth/react';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nearjam.app';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: {
      default: 'NearJam — ジャムセッション会場・スケジュール検索',
      template: '%s | NearJam',
    },
    description:
      '全国のジャズ・ブルース・ロックのジャムセッション会場を検索。定期開催セッションのスケジュール確認、参加申込み、ミュージシャンとのマッチングができます。',
    keywords: ['ジャムセッション', 'ジャズ', 'ブルース', 'セッション', '演奏', 'ライブハウス', 'ジャズバー'],
    manifest: '/manifest.json',
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages: {
        ja: `${BASE_URL}/ja`,
        en: `${BASE_URL}/en`,
      },
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'NearJam',
    },
    openGraph: {
      type: 'website',
      siteName: 'NearJam',
      title: 'NearJam — ジャムセッション会場・スケジュール検索',
      description: '全国のジャズ・ブルース・ロックのジャムセッション会場を検索。定期開催セッションのスケジュール確認、参加申込みができます。',
      locale: locale === 'ja' ? 'ja_JP' : 'en_US',
    },
    twitter: {
      card: 'summary',
      title: 'NearJam — ジャムセッション会場・スケジュール検索',
    },
    formatDetection: { telephone: false },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <ServiceWorkerRegister />
            <Header locale={locale} />
            <main className="mx-auto max-w-6xl px-4 py-6 pb-20 md:pb-6">
              {children}
            </main>
            <BottomNav />
            <footer className="mb-16 md:mb-0 mt-8 border-t border-gray-200 bg-white">
              <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
                <span>© {new Date().getFullYear()} NearJam</span>
                <nav className="flex gap-4">
                  <a href={`/${locale}/privacy`} className="hover:text-gray-700 hover:underline">
                    {locale === 'ja' ? 'プライバシーポリシー' : 'Privacy Policy'}
                  </a>
                  <a href={`/${locale}/terms`} className="hover:text-gray-700 hover:underline">
                    {locale === 'ja' ? '利用規約' : 'Terms of Service'}
                  </a>
                </nav>
              </div>
            </footer>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
