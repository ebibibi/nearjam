export const dynamic = 'force-dynamic';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const DAY_NAMES_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function dayName(dow: number | null | undefined, locale: string): string {
  if (dow == null) return '';
  return locale === 'ja' ? DAY_NAMES_JA[dow] : DAY_NAMES_EN[dow];
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
        take: 6,
        orderBy: { createdAt: 'desc' },
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
        take: 6,
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
        prisma.venue.count(),
        prisma.sessionTendency.count({ where: { isActive: true } }),
        prisma.jamSession.count({ where: { startsAt: { gte: new Date() } } }),
      ]),
      4000
    ).catch(() => null),
  ]);

  const venueCount = stats?.[0] ?? 0;
  const tendencyCount = stats?.[1] ?? 0;
  const upcomingCount = stats?.[2] ?? 0;

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
              <p className="mt-1 text-sm text-gray-500">{locale === 'ja' ? '登録会場' : 'Venues'}</p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-3xl font-bold text-violet-700">{tendencyCount}</p>
              <p className="mt-1 text-sm text-gray-500">{locale === 'ja' ? '定期セッション情報' : 'Regular Sessions'}</p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <p className="text-3xl font-bold text-violet-700">{upcomingCount}</p>
              <p className="mt-1 text-sm text-gray-500">{locale === 'ja' ? '今後のセッション' : 'Upcoming Sessions'}</p>
            </div>
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
                      {venue.walkMinutes != null && ` 徒歩${venue.walkMinutes}分`}
                    </p>
                  )}
                  {venue.tendencies.length > 0 ? (
                    <div className="space-y-2 flex-1">
                      {venue.tendencies.slice(0, 2).map((t, i) => (
                        <div key={i} className="rounded-lg bg-violet-50 px-3 py-2 text-xs">
                          <div className="font-medium text-violet-800 mb-0.5">{t.name}</div>
                          <div className="text-violet-600 space-x-2">
                            {t.typicalDayOfWeek != null && (
                              <span>毎週{dayName(t.typicalDayOfWeek, locale)}曜</span>
                            )}
                            {t.typicalStartTime && <span>{t.typicalStartTime}〜</span>}
                            {t.entrySystem && <span>{t.entrySystem}</span>}
                          </div>
                          {t.genres && t.genres.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {t.genres.slice(0, 3).map((g) => (
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
                      セッション情報なし
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
              最初のセッションを作成 →
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
                        📅 {startsAt.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          weekday: 'short',
                        })} {startsAt.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', {
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
                            無料/現地集金
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
          🎵 {locale === 'ja' ? 'NearJam の使い方' : 'How NearJam Works'}
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              step: '1',
              icon: '🔍',
              title: locale === 'ja' ? '会場を探す' : 'Find a Venue',
              desc: locale === 'ja'
                ? '近くのジャズバーやライブハウスを検索。毎週開催のセッション情報を確認できます。'
                : 'Search for jazz bars and live houses near you. Check recurring session info.',
            },
            {
              step: '2',
              icon: '🎸',
              title: locale === 'ja' ? 'セッションに参加' : 'Join a Session',
              desc: locale === 'ja'
                ? 'セッションに参加登録。Stripe で事前決済すれば当日キャンセル料も安心。'
                : 'Register for a session. Pre-pay with Stripe for secure cancellation protection.',
            },
            {
              step: '3',
              icon: '🎶',
              title: locale === 'ja' ? '一緒に演奏' : 'Play Together',
              desc: locale === 'ja'
                ? '楽器を持って会場へ！新しいミュージシャンと出会い、音楽でつながろう。'
                : 'Bring your instrument and meet new musicians. Connect through music!',
            },
          ].map(({ step, icon, title, desc }) => (
            <div key={step} className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-2xl">
                {icon}
              </div>
              <div className="text-xs font-medium text-violet-500 uppercase tracking-wide">Step {step}</div>
              <h3 className="font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href={`/${locale}/sessions/new`}>
            <Button variant="primary">
              {locale === 'ja' ? 'セッションを作成する →' : 'Create a Session →'}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
