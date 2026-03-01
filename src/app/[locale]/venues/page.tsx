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
  const count = await prisma.venue.count({ where: { tendencies: { some: { isActive: true } } } });
  const title = locale === 'ja' ? 'ジャムセッション会場一覧' : 'Jam Session Venues';
  const desc = locale === 'ja'
    ? `全国 ${count} 件のジャムセッション開催会場を掲載。ジャズ・ブルース・ファンクなど様々なジャンルのセッションが探せます。エリア・ジャンルで絞り込み可能。`
    : `Browse ${count} jam session venues. Find jazz, blues, and funk sessions near you. Filter by area and genre.`;
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
        <div className="flex flex-wrap gap-2">
          {genreFilter && (
            <Link
              href={`/${locale}/venues`}
              className="rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 px-3 py-1 text-xs"
            >
              ✕ クリア
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
      )}

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

      {/* 件数表示 + 全会場切り替え */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {q
            ? (locale === 'ja' ? `「${q}」の検索結果: ${venues.length} 件` : `${venues.length} results for "${q}"`)
            : genreFilter
            ? (locale === 'ja' ? `「${genreFilter}」の会場: ${venues.length} 件` : `${venues.length} venues for "${genreFilter}"`)
            : showAll
            ? (locale === 'ja' ? `全 ${venues.length} 件の会場` : `All ${venues.length} venues`)
            : (locale === 'ja' ? `セッション情報あり: ${venues.length} 件` : `${venues.length} venues with sessions`)
          }
        </p>
        {!q && (
          showAll ? (
            <Link href={`/${locale}/venues`} className="text-xs text-violet-600 hover:underline">
              {locale === 'ja' ? 'セッション情報あり会場のみ表示' : 'Show venues with sessions only'}
            </Link>
          ) : (
            <Link href={`/${locale}/venues?all=1`} className="text-xs text-gray-400 hover:underline">
              {locale === 'ja' ? '全会場を表示' : 'Show all venues'}
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
              <VenueCard key={venue.id} venue={venue} locale={locale} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
