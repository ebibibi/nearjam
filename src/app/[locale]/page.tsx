export const dynamic = 'force-dynamic';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/Button';
import { Suspense } from 'react';
import { HomeSearch } from '@/components/home/HomeSearch';
import { TodaysSessions } from '@/components/home/TodaysSessions';
import { UserGuide } from '@/components/home/UserGuide';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('siteTitle'), description: t('siteDesc') };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
    Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

  // 全 active な SessionTendency を会場情報付きで取得
  const [allTendencies, stats, topGenres] = await Promise.all([
    withTimeout(
      prisma.sessionTendency.findMany({
        where: { isActive: true },
        orderBy: [{ typicalStartTime: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          typicalDayOfWeek: true,
          typicalStartTime: true,
          typicalEndTime: true,
          genres: true,
          entrySystem: true,
          levelRange: true,
          sourceUrl: true,
          venue: {
            select: {
              id: true,
              name: true,
              nearestStation: true,
              walkMinutes: true,
              websiteUrl: true,
            },
          },
        },
      }),
      4000
    ).catch(() => null),
    withTimeout(
      Promise.all([
        prisma.venue.count({ where: { tendencies: { some: { isActive: true } } } }),
        prisma.sessionTendency.count({ where: { isActive: true } }),
      ]),
      4000
    ).catch(() => null),
    withTimeout(
      prisma.sessionTendency.findMany({ where: { isActive: true }, select: { genres: true } }).then((ts) => {
        const counts: Record<string, number> = {};
        for (const t of ts) for (const g of t.genres) counts[g] = (counts[g] ?? 0) + 1;
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([genre]) => genre);
      }),
      3000
    ).catch(() => [] as string[]),
  ]);

  const venueCount = stats?.[0] ?? 0;
  const tendencyCount = stats?.[1] ?? 0;

  // 今日の曜日（日本時間）
  const todayDow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getDay();

  return (
    <div className="space-y-10">
      {/* ── コンパクトHero ── */}
      <section className="rounded-2xl bg-gradient-to-br from-violet-700 via-violet-800 to-indigo-900 px-6 py-8 text-white text-center shadow-xl">
        <div className="mx-auto max-w-2xl space-y-4">
          <h1 className="text-2xl font-bold leading-tight md:text-3xl">
            🎷 {t('home.hero.title')}
          </h1>
          <p className="text-sm text-violet-200">
            {t('home.hero.subtitle')}
          </p>
          <Suspense fallback={null}>
            <HomeSearch />
          </Suspense>
        </div>
      </section>

      {/* ── Stats（コンパクト） ── */}
      {(venueCount > 0 || tendencyCount > 0) && (
        <div className="flex gap-4 justify-center text-center">
          <div className="rounded-lg border bg-white px-4 py-2 shadow-sm">
            <span className="text-xl font-bold text-violet-700">{venueCount}</span>
            <span className="ml-1.5 text-xs text-gray-500">{t('home.statsVenues')}</span>
          </div>
          <div className="rounded-lg border bg-white px-4 py-2 shadow-sm">
            <span className="text-xl font-bold text-violet-700">{tendencyCount}</span>
            <span className="ml-1.5 text-xs text-gray-500">{t('home.statsRegularSessions')}</span>
          </div>
        </div>
      )}

      {/* ── ユーザータイプ別ガイド ── */}
      <Suspense fallback={null}>
        <UserGuide />
      </Suspense>

      {/* ── ジャンルクイックフィルタ ── */}
      {topGenres && topGenres.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {topGenres.map((genre) => (
            <Link
              key={genre}
              href={`/${locale}/venues?genre=${encodeURIComponent(genre)}`}
              className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 text-xs font-medium transition-colors"
            >
              {genre}
            </Link>
          ))}
        </div>
      )}

      {/* ── 定期セッション一覧（メインコンテンツ！） ── */}
      {allTendencies && allTendencies.length > 0 && (
        <TodaysSessions tendencies={allTendencies} todayDow={todayDow} />
      )}

      {/* ── フッターCTA ── */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <Link href={`/${locale}/venues`}>
          <Button variant="secondary" size="sm">
            {t('home.browseVenues')} →
          </Button>
        </Link>
        <Link href={`/${locale}/venues/new`}>
          <Button variant="primary" size="sm">
            {t('home.addVenue')}
          </Button>
        </Link>
      </div>
    </div>
  );
}
