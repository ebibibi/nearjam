'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const otherLocale = locale === 'en' ? 'ja' : 'en';

  function switchLocale() {
    // /en/venues/123 → /ja/venues/123 のようにロケールセグメントを置換
    const newPath = pathname.replace(`/${locale}`, `/${otherLocale}`);
    startTransition(() => {
      router.push(newPath);
    });
  }

  return (
    <button
      onClick={switchLocale}
      disabled={isPending}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
      aria-label={`Switch to ${otherLocale === 'en' ? 'English' : '日本語'}`}
    >
      <span className="text-base">{locale === 'en' ? '🇺🇸' : '🇯🇵'}</span>
      <span className="uppercase">{otherLocale}</span>
    </button>
  );
}
