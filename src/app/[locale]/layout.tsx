import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Header } from '@/components/layout/Header';
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

export const metadata: Metadata = {
  title: 'NearJam — Find your next jam session',
  description:
    'Discover jam session venues, match with musicians, and play the songs you love — near you or online via SYNCROOM.',
};

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <Header locale={locale} />
            <main className="mx-auto max-w-6xl px-4 py-6">
              {children}
            </main>
            <footer className="mt-16 border-t border-gray-200 bg-white">
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
