'use client';

import { useSession, signOut } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';

export function AuthButton() {
  const { data: session, status } = useSession();
  const t = useTranslations('nav');
  const locale = useLocale();

  if (status === 'loading') {
    return <div className="h-9 w-20 animate-pulse rounded-lg bg-gray-200" />;
  }

  if (session) {
    return (
      <div className="flex items-center gap-2">
        <Link href={`/${locale}/profile`} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors">
          {session.user?.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? ''}
              width={28}
              height={28}
              className="rounded-full"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-violet-200 flex items-center justify-center text-violet-700 text-xs font-bold">
              {(session.user?.name ?? 'U')[0]}
            </div>
          )}
          <span className="text-sm text-gray-700 hidden sm:block max-w-[80px] truncate">
            {session.user?.name ?? t('profile')}
          </span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: `/${locale}` })}
        >
          {t('signOut')}
        </Button>
      </div>
    );
  }

  return (
    <Link href={`/${locale}/auth/signin`}>
      <Button size="sm">{t('signIn')}</Button>
    </Link>
  );
}
