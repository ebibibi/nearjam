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

  // 有効セッションがある会場の駅別カウント → トップ8エリアチップ
  const allVenuesWithStation = await prisma.venue.findMany({
    select: { nearestStation: true },
    where: { nearestStation: { not: null }, tendencies: { some: { isActive: true } } },
  });
  const stationCounts: Record<string, number> = {};
  for (const v of allVenuesWithStation) {
    const s = (v.nearestStation as string).replace(/駅$/, '');
    stationCounts[s] = (stationCounts[s] ?? 0) + 1;
  }
  const topStations = Object.entries(stationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([station, count]) => ({ station, count }));

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

      {/* エリアフィルタチップ */}
      {topStations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {q && (
            <Link
              href={`/${locale}/venues`}
              className="rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 px-3 py-1 text-xs"
            >
              ✕ クリア
            </Link>
          )}
          {topStations.map(({ station, count }) => {
            const isActive = q === station;
            return (
              <Link
                key={station}
                href={`/${locale}/venues?q=${encodeURIComponent(station)}`}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                }`}
              >
                📍 {station}
                <span className="ml-1 opacity-60">({count})</span>
              </Link>
            );
          })}
        </div>
      )}

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
        <>
          {q && (
            <p className="text-sm text-gray-500">
              {locale === 'ja' ? `「${q}」の検索結果: ${venues.length} 件` : `${venues.length} results for "${q}"`}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} locale={locale} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
