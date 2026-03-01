'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

export function BottomNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('nav');

  const links = [
    { href: `/${locale}`, label: t('home'), icon: '🏠', exact: true },
    { href: `/${locale}/venues`, label: t('venues'), icon: '📍', exact: false },
    { href: `/${locale}/sessions`, label: t('sessions'), icon: '🎷', exact: false },
    { href: `/${locale}/studios`, label: t('studios'), icon: '🎸', exact: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-stretch">
        {links.map(({ href, label, icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
                isActive ? 'text-violet-700' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className={isActive ? 'font-semibold' : ''}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
