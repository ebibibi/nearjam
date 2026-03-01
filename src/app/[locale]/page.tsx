export const dynamic = 'force-dynamic';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';
import { Suspense } from 'react';
import { Badge } from '@/components/ui/Badge';
import { HomeSearch } from '@/components/home/HomeSearch';
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

  const [venues, sessions, stats] = await Promise.all([
    withTimeout(
      prisma.venue.findMany({
        take: 9,
        where: {
          tendencies: { some: { isActive: true } },
        },
        orderBy: [{ verifiedAt: 'desc' }, { tendencies: { _count: 'desc' } }, { name: 'asc' }],
        include: {
          tendencies: {
            where: { isActive: true },
            take: 3,
            select: { name: true, typicalDayOfWeek: true, typicalStartTime: true, genres: true, entrySystem: true },
          },
        },
      }),
      4000
    ).catch(() => null),
    withTimeout(
      prisma.jamSession.findMany({
        take: 9,
        where: { startsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
        include: {
          venue: { select: { name: true, nearestStation: true } },
          registrations: { select: { id: true } },
        },
      }),
      4000
    ).catch(() => null),
    withTimeout(
      Promise.all([
        prisma.venue.count({ where: { tendencies: { some: { isActive: true } } } }),
        prisma.sessionTendency.count({ where: { isActive: true } }),
        (() => {
          const now = new Date();
          const endOfWeek = new Date(now);
          endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
          endOfWeek.setHours(23, 59, 59, 999);
          return prisma.jamSession.count({ where: { startsAt: { gte: now, lte: endOfWeek } } });
        })(),
      ]),
      4000
    ).catch(() => null),
  ]);

  const venueCount = stats?.[0] ?? 0;
  const tendencyCount = stats?.[1] ?? 0;
  const upcomingCount = stats?.[2] ?? 0;

  // ジャンル集計（トップ6）
  const topGenres = await withTimeout(
    prisma.sessionTendency.findMany({ where: { isActive: true }, select: { genres: true } }).then((ts) => {
      const counts: Record<string, number> = {};
      for (const t of ts) for (const g of t.genres) counts[g] = (counts[g] ?? 0) + 1;
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([genre]) => genre);
    }),
    3000
  ).catch(() => [] as string[]);

  return (
    <div className="space-y-16">
      {/* ── Hero ── */}
      <section className="rounded-2xl bg-gradient-to-br from-violet-700 via-violet-800 to-indigo-900 px-6 py-16 text-white text-center shadow-xl">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-5xl mb-2">🎷</div>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            {t('home.hero.title')}
          </h1>
          <p className="text-lg text-violet-200 leading-relaxed">
            {t('home.hero.subtitle')}
          </p>
          <Suspense fallback={null}>
            <HomeSearch />
          </Suspense>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href={`/${locale}/sessions`}>
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                {t('home.hero.ctaSessions')}
              </Button>
            </Link>
            <Link href={`/${locale}/venues`}>
              <Button size="lg" variant="ghost-inverse" className="w-full sm:w-auto">
                {t('home.hero.ctaVenues')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      {(venueCount > 0 || tendencyCount > 0 || upcomingCount > 0) && (
        <section>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-3xl font-bold text-violet-700">{venueCount}</p>
              <p className="mt-1 text-sm text-gray-500">{t('home.statsVenues')}</p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-3xl font-bold text-violet-700">{tendencyCount}</p>
              <p className="mt-1 text-sm text-gray-500">{t('home.statsRegularSessions')}</p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-3xl font-bold text-violet-700">{upcomingCount}</p>
              <p className="mt-1 text-sm text-gray-500">{t('home.statsThisWeek')}</p>
            </div>
          </div>
        </section>
      )}

      {/* ── ジャンルクイックリンク ── */}
      {topGenres && topGenres.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            🎵 {t('home.browseByGenre')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {topGenres.map((genre) => (
              <Link
                key={genre}
                href={`/${locale}/venues?genre=${encodeURIComponent(genre)}`}
                className="rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 text-sm font-medium transition-colors"
              >
                {genre}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── ピックアップ会場 ── */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            🏠 {t('home.featuredVenues')}
          </h2>
          <Link href={`/${locale}/venues`} className="text-sm text-violet-600 hover:underline">
            {t('common.viewAll')} →
          </Link>
        </div>
        {!venues || venues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
            <p className="text-lg">🎵</p>
            <p>{t('home.noVenues')}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <Link key={venue.id} href={`/${locale}/venues/${venue.id}`}>
                <Card hover className="h-full flex flex-col">
                  <div className="flex items-start justify-between mb-1">
                    <CardTitle className="flex-1 mr-2">{venue.name}</CardTitle>
                    {venue.verifiedAt ? (
                      <Badge variant="verified" className="shrink-0">✓</Badge>
                    ) : null}
                  </div>
                  {venue.nearestStation && (
                    <p className="text-xs text-gray-500 mb-3">
                      📍 {venue.nearestStation}
                      {venue.walkMinutes != null && ` ${venue.walkMinutes}${t('common.minutes')}`}
                    </p>
                  )}
                  {venue.tendencies.length > 0 ? (
                    <div className="space-y-2 flex-1">
                      {venue.tendencies.slice(0, 2).map((tendency, i) => (
                        <div key={i} className="rounded-lg bg-violet-50 px-3 py-2 text-xs">
                          <div className="font-medium text-violet-800 mb-0.5">{tendency.name}</div>
                          <div className="text-violet-600 space-x-2">
                            {tendency.typicalDayOfWeek != null && (
                              <span>{t('venue.everyDay', { day: t(`tendency.shortDays.${tendency.typicalDayOfWeek}` as Parameters<typeof t>[0]) })}</span>
                            )}
                            {tendency.typicalStartTime && <span>{t('venue.timeFrom', { time: tendency.typicalStartTime })}</span>}
                            {tendency.entrySystem && <span>{tendency.entrySystem}</span>}
                          </div>
                          {tendency.genres && tendency.genres.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {tendency.genres.slice(0, 3).map((g) => (
                                <span key={g} className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-700">
                                  {g}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <CardContent className="text-gray-400 text-sm flex-1">
                      {t('home.noSessionInfo')}
                    </CardContent>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── 今後のセッション ── */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            📅 {t('home.upcomingSessions')}
          </h2>
          <Link href={`/${locale}/sessions`} className="text-sm text-violet-600 hover:underline">
            {t('common.viewAll')} →
          </Link>
        </div>
        {!sessions || sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
            <p className="text-lg">🥁</p>
            <p>{t('home.noSessions')}</p>
            <Link href={`/${locale}/sessions/new`} className="mt-2 inline-block text-sm text-violet-600 hover:underline">
              {t('home.createSession')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => {
              const startsAt = new Date(session.startsAt);
              const registered = session.registrations.length;
              return (
                <Link key={session.id} href={`/${locale}/sessions/${session.id}`}>
                  <Card hover className="h-full flex flex-col">
                    <CardTitle className="mb-2 line-clamp-2">{session.title}</CardTitle>
                    <CardContent className="space-y-1.5 flex-1">
                      <p className="text-sm font-medium text-violet-700">
                        📅 {startsAt.toLocaleDateString(locale, {
                          month: 'short',
                          day: 'numeric',
                          weekday: 'short',
                        })} {startsAt.toLocaleTimeString(locale, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {session.venue && (
                        <p className="text-sm text-gray-600">
                          📍 {session.venue.name}
                          {session.venue.nearestStation && (
                            <span className="text-gray-400 text-xs ml-1">({session.venue.nearestStation})</span>
                          )}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {session.ticketPriceYen != null && session.ticketPriceYen > 0 ? (
                          <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-0.5">
                            ¥{session.ticketPriceYen.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs rounded-full bg-green-100 text-green-700 px-2 py-0.5">
                            {t('session.freeOrDoorPrice')}
                          </span>
                        )}
                        {session.maxParticipants != null && (
                          <span className="text-xs text-gray-400">
                            👥 {registered}/{session.maxParticipants}
                          </span>
                        )}
                        {session.isSyncroom && (
                          <Badge variant="syncroom">SYNCROOM</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 使い方 ── */}
      <section className="rounded-2xl bg-gray-50 border border-gray-100 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
          🎵 {t('home.howItWorks')}
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { step: '1', icon: '🔍', titleKey: 'home.howStep1Title', descKey: 'home.howStep1Desc' },
            { step: '2', icon: '🎸', titleKey: 'home.howStep2Title', descKey: 'home.howStep2Desc' },
            { step: '3', icon: '🎶', titleKey: 'home.howStep3Title', descKey: 'home.howStep3Desc' },
          ].map(({ step, icon, titleKey, descKey }) => (
            <div key={step} className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-2xl">
                {icon}
              </div>
              <div className="text-xs font-medium text-violet-500 uppercase tracking-wide">Step {step}</div>
              <h3 className="font-semibold text-gray-800">{t(titleKey as Parameters<typeof t>[0])}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t(descKey as Parameters<typeof t>[0])}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href={`/${locale}/sessions/new`}>
            <Button variant="primary">
              {t('home.createSession')}
            </Button>
          </Link>
        </div>
      </section>

      {/* ── 会場投稿CTA ── */}
      <section className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-8 text-center">
        <div className="text-3xl mb-3">📍</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {t('home.addVenueTitle')}
        </h2>
        <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
          {t('home.addVenueDesc')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/${locale}/venues/new`}>
            <Button variant="primary" size="sm">
              {t('home.addVenue')}
            </Button>
          </Link>
          <Link href={`/${locale}/venues`}>
            <Button variant="secondary" size="sm">
              {t('home.browseVenues')}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
