'use client';

import { useSession, signOut } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
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
        {session.user?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt={session.user.name ?? ''}
            className="h-8 w-8 rounded-full"
          />
        )}
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
