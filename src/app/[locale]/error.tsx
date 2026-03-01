'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errors');
  const locale = useLocale();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 px-4">
      <div className="text-6xl">🎵</div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">{t('errorTitle')}</h2>
        <p className="text-gray-600">{t('errorDesc')}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-violet-600 text-white px-6 py-2.5 text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          {t('retry')}
        </button>
        <Link
          href={`/${locale}`}
          className="rounded-lg border border-gray-300 text-gray-700 px-6 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          {t('backHome')}
        </Link>
      </div>
    </div>
  );
}
