import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { SessionCard } from '@/components/session/SessionCard';

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const session = await auth();

  const sessions = await prisma.jamSession.findMany({
    where: { startsAt: { gte: new Date() } },
    orderBy: { startsAt: 'asc' },
    take: 30,
    include: {
      venue: { select: { id: true, name: true, nearestStation: true } },
      studio: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('session.title')}</h1>
        {session?.user && (
          <Link href={`/${locale}/sessions/new`}>
            <Button size="sm">{t('session.create')}</Button>
          </Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500 mb-4">{t('session.noSessions')}</p>
          {session?.user && (
            <Link href={`/${locale}/sessions/new`}>
              <Button variant="secondary">{t('session.create')}</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
