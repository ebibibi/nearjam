export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { VerificationBadge } from '@/components/venue/VerificationBadge';
import { SessionTendencyCard } from '@/components/venue/SessionTendencyCard';
import { TendencyOwnerActions } from '@/components/venue/TendencyOwnerActions';
import { Button } from '@/components/ui/Button';
import { VenueClaimButton } from '@/components/venue/VenueClaimButton';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const venue = await prisma.venue.findUnique({
    where: { id },
    select: { name: true, address: true, nearestStation: true, tendencies: { where: { isActive: true }, select: { name: true, genres: true }, take: 3 } },
  });
  if (!venue) return {};

  const sessionNames = venue.tendencies.map(t => t.name).join('、');
  const genres = [...new Set(venue.tendencies.flatMap(t => t.genres))].slice(0, 5).join('・');
  const desc = [
    `${venue.name}のジャムセッション情報。`,
    venue.nearestStation ? `${venue.nearestStation}駅近く。` : '',
    sessionNames ? `定期セッション: ${sessionNames}。` : '',
    genres ? `ジャンル: ${genres}。` : '',
    'NearJam でセッションスケジュールを確認・参加申込できます。',
  ].join('');

  return {
    title: `${venue.name} — ジャムセッション`,
    description: desc.slice(0, 160),
    openGraph: {
      title: `${venue.name} のジャムセッション | NearJam`,
      description: desc.slice(0, 160),
    },
  };
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const authSession = await auth();
  const currentUserId = authSession?.user?.id ?? null;

  const [venue, upcomingSessions, topSongGroups] = await Promise.all([
    prisma.venue.findUnique({
      where: { id },
      include: {
        tendencies: {
          orderBy: [{ sourceType: 'asc' }, { createdAt: 'desc' }],
          include: { sourceUser: { select: { nickname: true } } },
        },
      },
    }),
    prisma.jamSession.findMany({
      where: {
        venueId: id,
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: 'asc' },
      take: 8,
      select: {
        id: true,
        title: true,
        startsAt: true,
        durationMinutes: true,
        ticketPriceYen: true,
        maxParticipants: true,
        _count: { select: { registrations: true } },
      },
    }),
    prisma.performanceLog.groupBy({
      by: ['songId'],
      where: { jamSession: { venueId: id }, songId: { not: null } },
      _count: { songId: true },
      orderBy: { _count: { songId: 'desc' } },
      take: 10,
    }),
  ]);

  if (!venue) notFound();

  // Top10 曲の詳細を取得
  const topSongIds = topSongGroups.map((g) => g.songId as string);
  const topSongs = topSongIds.length > 0
    ? await prisma.song.findMany({
        where: { id: { in: topSongIds } },
        select: { id: true, title: true, artist: true },
      })
    : [];
  // 演奏回数順に並び替え（groupBy の順序を維持）
  const topSongsOrdered = topSongIds.flatMap((sid) => {
    const song = topSongs.find((s) => s.id === sid);
    const count = topSongGroups.find((g) => g.songId === sid)?._count.songId ?? 0;
    return song ? [{ ...song, count }] : [];
  });

  const isOwner = !!currentUserId && venue?.ownerId === currentUserId;

  // 座標があれば精度の高いルート案内、なければ住所検索
  const mapsDestination =
    venue.lat != null && venue.lng != null
      ? `${venue.lat},${venue.lng}`
      : venue.address
        ? encodeURIComponent(venue.address)
        : null;
  const maps = mapsDestination
    ? `https://www.google.com/maps/dir/?api=1&destination=${mapsDestination}`
    : null;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Back + header */}
      <div>
        <Link
          href={`/${locale}/venues`}
          className="text-sm text-violet-600 hover:underline mb-3 inline-block"
        >
          ← {t('venue.title')}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">{venue.name}</h1>
          <VerificationBadge verifiedAt={venue.verifiedAt} disputedAt={venue.disputedAt} />
        </div>

        {venue.verifiedAt == null && (
          <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {t('venue.unverifiedNotice')}
          </p>
        )}
        {/* オーナー未設定 & ログイン済み → 申請ボタン */}
        {!venue.ownerId && currentUserId && (
          <div className="mt-3">
            <VenueClaimButton venueId={id} />
          </div>
        )}
      </div>

      {/* Info grid */}
      <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-700">
        {venue.address && (
          <div>
            <span className="font-medium">📍 {t('venue.address')}</span>
            <p className="mt-0.5 text-gray-600">{venue.address}</p>
          </div>
        )}
        {venue.nearestStation && (
          <div>
            <span className="font-medium">🚉 {t('venue.nearestStation')}</span>
            <p className="mt-0.5 text-gray-600">
              {venue.nearestStation}
              {venue.walkMinutes != null && ` (${venue.walkMinutes}${t('common.minutes')})`}
            </p>
          </div>
        )}
        {venue.websiteUrl && (
          <div>
            <span className="font-medium">🌐 {t('venue.website')}</span>
            <p className="mt-0.5">
              <a
                href={venue.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:underline break-all"
              >
                {venue.websiteUrl}
              </a>
            </p>
          </div>
        )}
        {venue.instagramUrl && (
          <div>
            <span className="font-medium">📸 {t('venue.instagram')}</span>
            <p className="mt-0.5">
              <a href={venue.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
                Instagram
              </a>
            </p>
          </div>
        )}
        {venue.xUrl && (
          <div>
            <span className="font-medium">🐦 {t('venue.twitter')}</span>
            <p className="mt-0.5">
              <a href={venue.xUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
                X / Twitter
              </a>
            </p>
          </div>
        )}
        {venue.bookingPhone && (
          <div>
            <span className="font-medium">📞 {t('venue.phone')}</span>
            <p className="mt-0.5 text-gray-600">{venue.bookingPhone}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {maps && (
          <a href={maps} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm">📍 {t('venue.directions')}</Button>
          </a>
        )}
        {venue.bookingUrl && (
          <a href={venue.bookingUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm">📅 {t('venue.booking')}</Button>
          </a>
        )}
      </div>

      {/* 今後のセッション */}
      {upcomingSessions.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">📅 今後のセッション</h2>
          <div className="space-y-2">
            {upcomingSessions.map((s) => {
              const startsAt = new Date(s.startsAt);
              return (
                <Link key={s.id} href={`/${locale}/sessions/${s.id}`}>
                  <div className="flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 hover:bg-violet-50 hover:border-violet-200 px-4 py-3 transition-colors">
                    <div className="text-center min-w-[3rem]">
                      <div className="text-xs text-gray-400">
                        {startsAt.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', { month: 'short' })}
                      </div>
                      <div className="text-xl font-bold text-gray-800">{startsAt.getDate()}</div>
                      <div className="text-xs text-gray-400">
                        {startsAt.toLocaleDateString(locale === 'ja' ? 'ja-JP' : 'en-US', { weekday: 'short' })}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">{s.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {startsAt.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        {s.durationMinutes && ` （${s.durationMinutes}分）`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {s.ticketPriceYen != null && s.ticketPriceYen > 0 ? (
                        <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-1">¥{s.ticketPriceYen.toLocaleString()}</span>
                      ) : (
                        <span className="text-xs rounded-full bg-green-100 text-green-700 px-2 py-1">無料</span>
                      )}
                      {s.maxParticipants != null && (
                        <div className="text-xs text-gray-400 mt-1">
                          👥 {s._count.registrations}/{s.maxParticipants}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="mt-3 text-center">
            <Link href={`/${locale}/sessions?venue=${encodeURIComponent(venue.name)}`} className="text-sm text-violet-600 hover:underline">
              この会場の全セッションを見る →
            </Link>
          </div>
        </section>
      )}

      {/* Top songs at this venue */}
      {topSongsOrdered.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('venue.topSongs')}</h2>
          <div className="space-y-1.5">
            {topSongsOrdered.map((song, idx) => (
              <div key={song.id} className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 font-mono w-5 text-right">{idx + 1}</span>
                <span className="font-medium text-gray-900">{song.title}</span>
                {song.artist && <span className="text-gray-400">— {song.artist}</span>}
                <span className="ml-auto text-xs text-gray-400">{song.count}x</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* House Rules */}
      {venue.rulesMarkdown && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('venue.rulesPage')}</h2>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
            {venue.rulesMarkdown}
          </div>
        </section>
      )}

      {/* Session Tendencies */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('venue.sessionTendencies')}</h2>
          <Link href={`/${locale}/venues/${id}/add-tendency`}>
            <Button variant="secondary" size="sm">{t('venue.addTendency')}</Button>
          </Link>
        </div>

        {venue.tendencies.filter((t) => t.isActive).length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center">
            <p className="text-gray-500 text-sm mb-3">{t('venue.noTendencies')}</p>
            <Link href={`/${locale}/venues/${id}/add-tendency`}>
              <Button variant="secondary" size="sm">{t('venue.addTendency')}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {venue.tendencies.map((tendency) => (
              <div key={tendency.id}>
                <SessionTendencyCard tendency={tendency} />
                {isOwner && (
                  <TendencyOwnerActions
                    venueId={id}
                    tendencyId={tendency.id}
                    currentSourceType={tendency.sourceType}
                    isActive={tendency.isActive}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
