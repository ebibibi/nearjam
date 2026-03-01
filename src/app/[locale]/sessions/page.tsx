export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { SessionCard } from '@/components/session/SessionCard';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const count = await prisma.jamSession.count({ where: { startsAt: { gte: new Date() } } });
  const title = locale === 'ja' ? 'セッション一覧' : 'Sessions';
  const desc = locale === 'ja'
    ? `全国のジャムセッション ${count} 件を掲載中。ジャズ・ブルース・ファンク・ラテンなど幅広いジャンルのセッションを検索・参加申込できます。`
    : `Browse ${count} jam sessions. Search and register for jazz, blues, funk, and latin sessions near you.`;
  return {
    title,
    description: desc,
    openGraph: { title: `${title} | NearJam`, description: desc },
  };
}

function getWeekLabel(date: Date, locale: string): string {
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

  if (d < startOfNextWeek) return locale === 'ja' ? '今週' : 'This Week';
  if (d < startOfWeekAfterNext) return locale === 'ja' ? '来週' : 'Next Week';

  const mo = d.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', { month: 'long' });
  const wk = Math.floor((d.getDate() - 1) / 7) + 1;
  return locale === 'ja' ? `${mo} 第${wk}週` : `${mo} Week ${wk}`;
}

export default async function SessionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ venue?: string; station?: string }>;
}) {
  const { locale } = await params;
  const { venue: venueFilter, station: stationFilter } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const authSession = await auth();
  const eightWeeksLater = new Date(Date.now() + 56 * 24 * 60 * 60 * 1000);

  // 最寄り駅別セッション件数集計 → トップ8
  const sessionVenues = await prisma.jamSession.findMany({
    where: { startsAt: { gte: new Date(), lte: eightWeeksLater }, venue: { nearestStation: { not: null } } },
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
      startsAt: { gte: new Date(), lte: eightWeeksLater },
      ...(venueFilter ? { venue: { name: { contains: venueFilter, mode: 'insensitive' } } } : {}),
      ...(stationFilter ? { venue: { nearestStation: { contains: stationFilter, mode: 'insensitive' } } } : {}),
    },
    orderBy: { startsAt: 'asc' },
    take: 200,
    include: {
      venue: { select: { id: true, name: true, nearestStation: true } },
      studio: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
    },
  });

  // 週別グルーピング
  const weekMap = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const label = getWeekLabel(new Date(s.startsAt), locale);
    if (!weekMap.has(label)) weekMap.set(label, []);
    weekMap.get(label)!.push(s);
  }
  const weekGroups = [...weekMap.entries()].map(([label, wSessions]) => ({ label, sessions: wSessions }));

  const hasFilter = !!venueFilter || !!stationFilter;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('session.title')}</h1>
          {sessions.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">今後 8 週間で {sessions.length} 件</p>
          )}
        </div>
        {authSession?.user && (
          <Link href={`/${locale}/sessions/new`}>
            <Button size="sm">{t('session.create')}</Button>
          </Link>
        )}
      </div>

      {/* 最寄り駅フィルタチップ */}
      {topStations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {hasFilter && (
            <Link
              href={`/${locale}/sessions`}
              className="rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 px-3 py-1 text-xs"
            >
              ✕ クリア
            </Link>
          )}
          {topStations.map(({ station, count }) => {
            const isActive = stationFilter === station;
            return (
              <Link
                key={station}
                href={`/${locale}/sessions?station=${encodeURIComponent(station)}`}
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

      {/* 会場フィルターバッジ */}
      {venueFilter && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">フィルター:</span>
          <span className="rounded-full bg-violet-100 text-violet-700 px-3 py-1">🏠 {venueFilter}</span>
          <Link href={`/${locale}/sessions`} className="text-gray-400 hover:text-gray-600">✕ クリア</Link>
        </div>
      )}

      {sessions.length === 0 ? (
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

      {!authSession?.user && sessions.length > 0 && (
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
