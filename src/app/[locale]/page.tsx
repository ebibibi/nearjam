import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  // SSRで直接Prismaを呼ぶ — DB 接続失敗時は空配列にフォールバック
  const [venues, sessions] = await Promise.all([
    prisma.venue.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        tendencies: { where: { isActive: true }, take: 1 },
      },
    }).catch(() => []),
    prisma.jamSession.findMany({
      take: 4,
      where: { startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      include: {
        venue: { select: { name: true, nearestStation: true } },
      },
    }).catch(() => []),
  ]);

  return (
    <div className="space-y-12">
      {/* Hero セクション */}
      <section className="rounded-2xl bg-gradient-to-br from-violet-700 to-violet-900 px-8 py-16 text-white text-center">
        <div className="mx-auto max-w-2xl space-y-6">
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            🎸 {t('home.hero.title')}
          </h1>
          <p className="text-lg text-violet-200 leading-relaxed">
            {t('home.hero.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href={`/${locale}/sessions`}>
              <Button size="lg" className="bg-white text-violet-700 hover:bg-violet-50 w-full sm:w-auto">
                {t('home.hero.ctaSessions')}
              </Button>
            </Link>
            <Link href={`/${locale}/venues`}>
              <Button size="lg" variant="secondary" className="border-white/40 text-white hover:bg-white/10 bg-transparent w-full sm:w-auto">
                {t('home.hero.ctaVenues')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ピックアップ会場 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{t('home.featuredVenues')}</h2>
          <Link href={`/${locale}/venues`} className="text-sm text-violet-600 hover:underline">
            {t('common.viewAll')}
          </Link>
        </div>
        {venues.length === 0 ? (
          <p className="text-gray-500 text-sm">{t('home.noVenues')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <Link key={venue.id} href={`/${locale}/venues/${venue.id}`}>
                <Card hover className="h-full">
                  <CardTitle className="mb-1">{venue.name}</CardTitle>
                  {venue.nearestStation && (
                    <p className="text-xs text-gray-500 mb-2">
                      📍 {venue.nearestStation}
                      {venue.walkMinutes != null && ` (${venue.walkMinutes}${t('common.minutes')})`}
                    </p>
                  )}
                  {venue.tendencies[0] && (
                    <CardContent>
                      <p className="line-clamp-2">{venue.tendencies[0].name}</p>
                    </CardContent>
                  )}
                  <div className="mt-2">
                    {venue.verifiedAt ? (
                      <Badge variant="verified">{t('venue.verified')}</Badge>
                    ) : (
                      <Badge variant="unverified">{t('venue.unverified')}</Badge>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 今後のセッション */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{t('home.upcomingSessions')}</h2>
          <Link href={`/${locale}/sessions`} className="text-sm text-violet-600 hover:underline">
            {t('common.viewAll')}
          </Link>
        </div>
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-sm">{t('home.noSessions')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sessions.map((session) => (
              <Link key={session.id} href={`/${locale}/sessions/${session.id}`}>
                <Card hover>
                  <CardTitle className="mb-1">{session.title}</CardTitle>
                  <CardContent className="space-y-1">
                    <p>
                      📅 {new Date(session.startsAt).toLocaleDateString(locale, {
                        month: 'short',
                        day: 'numeric',
                        weekday: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {session.venue && (
                      <p>📍 {session.venue.name}</p>
                    )}
                    {session.isSyncroom && (
                      <Badge variant="syncroom">SYNCROOM</Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
