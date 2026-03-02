export const dynamic = 'force-dynamic';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: `${t('signIn')} Error — NearJam` };
}
import { Button } from '@/components/ui/Button';

export default async function AuthErrorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('auth');

  const errorKey = error ?? 'default';
  const message = t(`errors.${errorKey as 'default'}`, { fallback: t('errors.default') });

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md space-y-4 text-center">
        <span className="text-5xl">😕</span>
        <h1 className="text-xl font-bold text-gray-900">{t('signIn')} Error</h1>
        <p className="text-sm text-gray-600">{message}</p>
        <Link href={`/${locale}/auth/signin`}>
          <Button variant="secondary">{t('signIn')}</Button>
        </Link>
      </div>
    </div>
  );
}
