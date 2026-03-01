export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Suspense } from 'react';
import { Button } from '@/components/ui/Button';
import { SessionCard } from '@/components/session/SessionCard';
import { SessionSearch } from '@/components/session/SessionSearch';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const count = await prisma.jamSession.count({ where: { startsAt: { gte: new Date() } } });
  const title = t('session.meta.title');
  const desc = t('session.meta.desc', { count });
  return {
    title,
    description: desc,
    openGraph: { title: `${title} | NearJam`, description: desc },
  };
}

function getWeekLabel(date: Date, locale: string, t: (key: string, params?: Record<string, unknown>) => string): string {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfNextWeek = new Date(startOfThisWeek);
  startOfNextWeek.setDate(startOfThisWeek.getDate() + 7);
  const startOfWeekAfterNext = new Date(startOfNextWeek);
  startOfWeekAfterNext.setDate(startOfNextWeek.getDate() + 7);

  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (d < startOfNextWeek) return t('session.thisWeek');
  if (d < startOfWeekAfterNext) return t('session.nextWeek');

  const mo = d.toLocaleDateString(locale, { month: 'long' });
  const wk = Math.floor((d.getDate() - 1) / 7) + 1;
  return t('session.weekLabel', { month: mo, n: wk });
}

export default async function SessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ venue?: string; station?: string; dow?: string; q?: string; free?: string; syncroom?: string }>;
}) {
  const { locale } = await params;
  const { venue: venueFilter, station: stationFilter, dow: dowParam, q: keywordFilter, free: freeParam, syncroom: syncroomParam } = await searchParams;
  const dowFilter = dowParam != null ? parseInt(dowParam, 10) : null;
  const freeOnly = freeParam === '1';
  const syncroomOnly = syncroomParam === '1';
  setRequestLocale(locale);
  const t = await getTranslations();

  const authSession = await auth();
  const now = new Date();
  const eightWeeksLater = new Date(now.getTime() + 56 * 24 * 60 * 60 * 1000);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  // 最寄り駅別セッション件数集計 → トップ8
  const sessionVenues = await prisma.jamSession.findMany({
    where: { startsAt: { gte: now, lte: eightWeeksLater }, venue: { nearestStation: { not: null } } },
    select: { venue: { select: { nearestStation: true } } },
  });
  const stationCounts: Record<string, number> = {};
  for (const s of sessionVenues) {
    const station = s.venue?.nearestStation?.replace(/駅$/, '');
    if (station) stationCounts[station] = (stationCounts[station] ?? 0) + 1;
  }
  const topStations = Object.entries(stationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([station, count]) => ({ station, count }));

  const sessions = await prisma.jamSession.findMany({
    where: {
      startsAt: { gte: now, lte: eightWeeksLater },
      ...(keywordFilter ? {
        OR: [
          { title: { contains: keywordFilter, mode: 'insensitive' } },
          { venue: { name: { contains: keywordFilter, mode: 'insensitive' } } },
        ],
      } : {}),
      ...(venueFilter && !keywordFilter ? { venue: { name: { contains: venueFilter, mode: 'insensitive' } } } : {}),
      ...(stationFilter ? { venue: { nearestStation: { contains: stationFilter, mode: 'insensitive' } } } : {}),
      ...(freeOnly ? { ticketPriceYen: { lte: 0 } } : {}),
      ...(syncroomOnly ? { isSyncroom: true } : {}),
    },
    orderBy: { startsAt: 'asc' },
    take: 200,
    select: {
      id: true,
      title: true,
      startsAt: true,
      durationMinutes: true,
      format: true,
      isSyncroom: true,
      moodFlags: true,
      maxParticipants: true,
      ticketPriceYen: true,
      venue: { select: { id: true, name: true, nearestStation: true } },
      studio: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
    },
  });

  // 曜日フィルタ（JS側）
  const filteredSessions = dowFilter != null
    ? sessions.filter((s) => new Date(s.startsAt).getDay() === dowFilter)
    : sessions;

  // 週別グルーピング
  const weekMap = new Map<string, typeof sessions>();
  for (const s of filteredSessions) {
    const label = getWeekLabel(new Date(s.startsAt), locale, (key, params) => t(key as Parameters<typeof t>[0], params as Parameters<typeof t>[1]));
    if (!weekMap.has(label)) weekMap.set(label, []);
    weekMap.get(label)!.push(s);
  }
  const weekGroups = [...weekMap.entries()].map(([label, wSessions]) => ({ label, sessions: wSessions }));

  const hasFilter = !!venueFilter || !!stationFilter || dowFilter != null || !!keywordFilter || freeOnly || syncroomOnly;

  // 今日のセッション（フィルタなし時のみ）
  const todaySessions = !hasFilter
    ? sessions.filter((s) => new Date(s.startsAt) <= endOfToday)
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('session.title')}</h1>
          {sessions.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {dowFilter != null
                ? t('session.countResultsFiltered', { n: filteredSessions.length })
                : t('session.countResults', { n: filteredSessions.length })}
            </p>
          )}
        </div>
        {authSession?.user && (
          <Link href={`/${locale}/sessions/new`}>
            <Button size="sm">{t('session.create')}</Button>
          </Link>
        )}
      </div>

      {/* キーワード検索 */}
      <Suspense fallback={null}>
        <SessionSearch defaultValue={keywordFilter} />
      </Suspense>

      {/* 曜日フィルタチップ */}
      {(() => {
        const days = [0, 1, 2, 3, 4, 5, 6].map((i) => t(`tendency.shortDays.${i}` as Parameters<typeof t>[0]));
        // 各曜日のセッション件数を事前計算
        const dowCounts = Array.from({ length: 7 }, (_, i) =>
          sessions.filter((s) => new Date(s.startsAt).getDay() === i).length
        );
        return (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              📅 {t('common.filterByDay')}
            </p>
          <div className="flex flex-wrap gap-2">
            {hasFilter && (
              <Link
                href={`/${locale}/sessions`}
                className="rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 px-3 py-1 text-xs"
              >
                {t('common.clear')}
              </Link>
            )}
            {days.map((day, i) => {
              const count = dowCounts[i];
              if (count === 0) return null;
              const isActive = dowFilter === i;
              const href = stationFilter
                ? `/${locale}/sessions?station=${encodeURIComponent(stationFilter)}&dow=${i}`
                : `/${locale}/sessions?dow=${i}`;
              return (
                <Link
                  key={i}
                  href={isActive ? (stationFilter ? `/${locale}/sessions?station=${encodeURIComponent(stationFilter)}` : `/${locale}/sessions`) : href}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  {day}
                  <span className="ml-1 opacity-60">({count})</span>
                </Link>
              );
            })}
          </div>
          </div>
        );
      })()}

      {/* 最寄り駅フィルタチップ */}
      {topStations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            📍 {t('common.filterByArea')}
          </p>
        <div className="flex flex-wrap gap-2">
          {hasFilter && !sessions.some(() => true) && (
            <Link
              href={`/${locale}/sessions`}
              className="rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 px-3 py-1 text-xs"
            >
              {t('common.clear')}
            </Link>
          )}
          {topStations.map(({ station, count }) => {
            const isActive = stationFilter === station;
            const href = dowFilter != null
              ? `/${locale}/sessions?station=${encodeURIComponent(station)}&dow=${dowFilter}`
              : `/${locale}/sessions?station=${encodeURIComponent(station)}`;
            return (
              <Link
                key={station}
                href={isActive ? (dowFilter != null ? `/${locale}/sessions?dow=${dowFilter}` : `/${locale}/sessions`) : href}
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

      {/* 無料 / SYNCROOM フィルタ */}
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={freeOnly
            ? `/${locale}/sessions${stationFilter ? `?station=${encodeURIComponent(stationFilter)}` : ''}`
            : `/${locale}/sessions?free=1${stationFilter ? `&station=${encodeURIComponent(stationFilter)}` : ''}`}
          className={`rounded-full px-3 py-1 text-xs transition-colors ${
            freeOnly
              ? 'bg-green-600 text-white'
              : 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          💚 {t('session.freeOnly')}
        </Link>
        <Link
          href={syncroomOnly
            ? `/${locale}/sessions${stationFilter ? `?station=${encodeURIComponent(stationFilter)}` : ''}`
            : `/${locale}/sessions?syncroom=1${stationFilter ? `&station=${encodeURIComponent(stationFilter)}` : ''}`}
          className={`rounded-full px-3 py-1 text-xs transition-colors ${
            syncroomOnly
              ? 'bg-blue-600 text-white'
              : 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
          }`}
        >
          🎧 SYNCROOM
        </Link>
      </div>

      {/* 会場フィルターバッジ */}
      {venueFilter && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">フィルター:</span>
          <span className="rounded-full bg-violet-100 text-violet-700 px-3 py-1">🏠 {venueFilter}</span>
          <Link href={`/${locale}/sessions`} className="text-gray-400 hover:text-gray-600">{t('common.clear')}</Link>
        </div>
      )}

      {/* 今日のセッション（フィルタなし時のみ） */}
      {todaySessions.length > 0 && (
        <section className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <h2 className="text-base font-bold text-amber-900 mb-3">
            ☀️ {t('session.todaysSessions')}
            <span className="ml-2 text-sm font-normal text-amber-600">{todaySessions.length} 件</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {todaySessions.map((s) => (
              <SessionCard key={s.id} session={s} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {filteredSessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500 mb-4">{t('session.noSessions')}</p>
          {authSession?.user && (
            <Link href={`/${locale}/sessions/new`}>
              <Button variant="secondary">{t('session.create')}</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {weekGroups.map(({ label, sessions: weekSessions }) => (
            <section key={label}>
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="rounded-lg bg-violet-100 text-violet-700 px-3 py-1 text-base">{label}</span>
                <span className="text-sm font-normal text-gray-400">{weekSessions.length} 件</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {weekSessions.map((s) => (
                  <SessionCard key={s.id} session={s} locale={locale} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!authSession?.user && filteredSessions.length > 0 && (
        <div className="rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 p-6 text-center">
          <p className="text-gray-700 font-medium mb-2">🎷 あなたもセッションを開催しませんか？</p>
          <p className="text-sm text-gray-500 mb-4">アカウント登録すると、セッションの作成・参加申込ができます。</p>
          <Link href={`/${locale}/auth/signin`}>
            <Button variant="primary">登録・ログインする</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
