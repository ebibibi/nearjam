import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionForm } from '@/components/session/SessionForm';

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/auth/signin`);
  }

  const [venues, studios] = await Promise.all([
    prisma.venue.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.studio.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/${locale}/sessions`} className="text-sm text-violet-600 hover:underline mb-2 inline-block">
          ← {t('session.title')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('session.create')}</h1>
      </div>
      <SessionForm locale={locale} venues={venues} studios={studios} />
    </div>
  );
}
