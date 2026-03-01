export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/Button';
import { VenueCard } from '@/components/venue/VenueCard';
import { VenueSearch } from '@/components/venue/VenueSearch';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const count = await prisma.venue.count({ where: { tendencies: { some: { isActive: true } } } });
  const title = t('venue.meta.title');
  const desc = t('venue.meta.desc', { count });
  return {
    title,
    description: desc,
    openGraph: { title: `${title} | NearJam`, description: desc },
  };
}

export default async function VenuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; all?: string; genre?: string }>;
}) {
  const { locale } = await params;
  const { q, all, genre: genreFilter } = await searchParams;
  const showAll = all === '1';
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

  // ジャンル集計（アクティブなtendencyから）
  const allTendencyGenres = await prisma.sessionTendency.findMany({
    where: { isActive: true },
    select: { genres: true },
  });
  const genreCounts: Record<string, number> = {};
  for (const t of allTendencyGenres) {
    for (const g of t.genres) {
      genreCounts[g] = (genreCounts[g] ?? 0) + 1;
    }
  }
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([genre, count]) => ({ genre, count }));

  // デフォルトはセッション情報あり会場のみ表示（?all=1 で全会場表示）
  const baseWhere = showAll || q || genreFilter ? undefined : { tendencies: { some: { isActive: true } } };
  // 各会場の今後30日のセッション件数
  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingCounts = await prisma.jamSession.groupBy({
    by: ['venueId'],
    where: { startsAt: { gte: now, lte: thirtyDaysLater }, venueId: { not: null } },
    _count: { id: true },
  }).then((rows) => Object.fromEntries(rows.map((r) => [r.venueId!, r._count.id])));

  const venues = await prisma.venue.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { nearestStation: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        }
      : genreFilter
      ? { tendencies: { some: { isActive: true, genres: { has: genreFilter } } } }
      : baseWhere,
    orderBy: [{ verifiedAt: 'desc' }, { tendencies: { _count: 'desc' } }, { name: 'asc' }],
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

      {/* ジャンルフィルタチップ */}
      {topGenres.length > 0 && !q && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">🎵 {t('common.filterByGenre')}</p>
          <div className="flex flex-wrap gap-2">
          {genreFilter && (
            <Link
              href={`/${locale}/venues`}
              className="rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 px-3 py-1 text-xs"
            >
              {t('common.clear')}
            </Link>
          )}
          {topGenres.map(({ genre, count }) => {
            const isActive = genreFilter === genre;
            return (
              <Link
                key={genre}
                href={isActive ? `/${locale}/venues` : `/${locale}/venues?genre=${encodeURIComponent(genre)}`}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                🎵 {genre}
                <span className="ml-1 opacity-60">({count})</span>
              </Link>
            );
          })}
          </div>
        </div>
      )}

      {/* エリアフィルタチップ */}
      {topStations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">📍 {t('common.filterByArea')}</p>
          <div className="flex flex-wrap gap-2">
          {q && (
            <Link
              href={`/${locale}/venues`}
              className="rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 px-3 py-1 text-xs"
            >
              {t('common.clear')}
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
        </div>
      )}

      {/* 件数表示 + 全会場切り替え */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {q
            ? t('venue.searchResults', { n: venues.length, q })
            : genreFilter
            ? t('venue.genreResults', { n: venues.length, genre: genreFilter })
            : showAll
            ? t('venue.allVenues', { n: venues.length })
            : t('venue.withSessions', { n: venues.length })
          }
        </p>
        {!q && (
          showAll ? (
            <Link href={`/${locale}/venues`} className="text-xs text-violet-600 hover:underline">
              {t('venue.showWithSessions')}
            </Link>
          ) : (
            <Link href={`/${locale}/venues?all=1`} className="text-xs text-gray-400 hover:underline">
              {t('venue.showAll')}
            </Link>
          )
        )}
      </div>

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} locale={locale} upcomingSessionCount={upcomingCounts[venue.id] ?? 0} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
