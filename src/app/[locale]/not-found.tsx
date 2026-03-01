'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('errors');
  const locale = useLocale();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 px-4">
      <div className="text-6xl">🎸</div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">404</h1>
        <p className="text-gray-600">{t('notFoundTitle')}</p>
        <p className="text-sm text-gray-400">{t('notFoundDesc')}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/${locale}/venues`}
          className="rounded-lg bg-violet-600 text-white px-6 py-2.5 text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          {t('toVenues')}
        </Link>
        <Link
          href={`/${locale}/sessions`}
          className="rounded-lg border border-violet-300 text-violet-700 px-6 py-2.5 text-sm font-medium hover:bg-violet-50 transition-colors"
        >
          {t('toSessions')}
        </Link>
      </div>
    </div>
  );
}
