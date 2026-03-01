import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from './LanguageSwitcher';
import { AuthButton } from './AuthButton';
import { MobileNav } from './MobileNav';

interface HeaderProps {
  locale: string;
}

export async function Header({ locale }: HeaderProps) {
  const t = await getTranslations('nav');

  const navLinks = [
    { href: `/${locale}/venues`, label: t('venues') },
    { href: `/${locale}/sessions`, label: t('sessions') },
    { href: `/${locale}/studios`, label: t('studios') },
    { href: `/${locale}/songs`, label: t('songs') },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="relative mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        {/* ロゴ */}
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <span className="text-xl">🎸</span>
          <span className="text-lg font-bold text-violet-700">NearJam</span>
        </Link>

        {/* ナビゲーション（デスクトップ） */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* 右側: モバイルメニュー + 言語スイッチャー + 認証ボタン */}
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <AuthButton />
          <MobileNav navLinks={navLinks} />
        </div>
      </div>
    </header>
  );
}
