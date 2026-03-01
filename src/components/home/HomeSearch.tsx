'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';

export function HomeSearch() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    if (q) {
      router.push(`/${locale}/venues?q=${encodeURIComponent(q)}`);
    } else {
      router.push(`/${locale}/venues`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
      <input
        ref={inputRef}
        type="search"
        placeholder={t('searchPlaceholder')}
        className="flex-1 rounded-full px-4 py-2.5 text-sm text-gray-900 bg-white/95 border-0 focus:outline-none focus:ring-2 focus:ring-white shadow-sm"
      />
      <button
        type="submit"
        className="rounded-full bg-white text-violet-700 font-medium px-5 py-2.5 text-sm hover:bg-violet-50 transition-colors shadow-sm"
      >
        {tCommon('search')}
      </button>
    </form>
  );
}
