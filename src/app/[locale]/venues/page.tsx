export const dynamic = 'force-dynamic';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/Button';
import { VenueCard } from '@/components/venue/VenueCard';
import { VenueSearch } from '@/components/venue/VenueSearch';

export default async function VenuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const venues = await prisma.venue.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { nearestStation: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: [{ verifiedAt: 'desc' }, { name: 'asc' }],
    include: {
      tendencies: {
        where: { isActive: true },
        orderBy: [{ sourceType: 'asc' }, { createdAt: 'desc' }],
        take: 3,
        select: {
          name: true,
          typicalDayOfWeek: true,
          typicalStartTime: true,
          genres: true,
          entrySystem: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('venue.title')}</h1>
        <Link href={`/${locale}/venues/new`}>
          <Button size="sm">{t('venue.add')}</Button>
        </Link>
      </div>

      <Suspense fallback={null}>
        <VenueSearch defaultValue={q} />
      </Suspense>

      {venues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500 mb-4">{t('common.noResults')}</p>
          {!q && (
            <Link href={`/${locale}/venues/new`}>
              <Button variant="secondary">{t('venue.add')}</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
