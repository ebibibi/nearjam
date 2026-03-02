export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MoodFlagBadges } from '@/components/session/MoodFlagBadges';
import { RegistrationButton } from '@/components/session/RegistrationButton';
import { SessionAdminPanel } from '@/components/session/SessionAdminPanel';
import { PrivacySettingsPanel } from '@/components/session/PrivacySettingsPanel';
import { TicketSection } from '@/components/session/TicketSection';
import { ShareButton } from '@/components/session/ShareButton';
import { KudosForm } from '@/components/kudos/KudosForm';
import { FeedbackForm } from '@/components/session/FeedbackForm';
import { CancellationPolicy } from '@/lib/stripe';
import ReactMarkdown from 'react-markdown';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const session = await prisma.jamSession.findUnique({
    where: { id },
    select: {
      title: true,
      startsAt: true,
      venue: { select: { name: true, nearestStation: true } },
    },
  });
  if (!session) return {};

  const t = await getTranslations({ locale });
  const dateStr = new Date(session.startsAt).toLocaleDateString(locale, {
    month: 'long', day: 'numeric', weekday: 'short',
  });
  const venuePart = session.venue?.name ?? '';
  const stationSuffix = session.venue?.nearestStation
    ? t('session.meta.stationSuffix', { station: session.venue.nearestStation })
    : '';
  const desc = t('session.meta.detailDesc2', { venuePart, stationSuffix, dateStr });

  return {
    title: session.title,
    description: desc.slice(0, 160),
    openGraph: {
      title: `${session.title} | NearJam`,
      description: desc.slice(0, 160),
    },
  };
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [session, authSession] = await Promise.all([
    prisma.jamSession.findUnique({
      where: { id },
      include: {
        venue: { select: { id: true, name: true, nearestStation: true, address: true } },
        studio: { select: { id: true, name: true } },
        sessionAdmin: { select: { id: true, stripeAccountId: true } },
        songs: {
          orderBy: { orderIndex: 'asc' },
          include: { song: { select: { id: true, title: true, artist: true, genre: true } } },
        },
        privacySettings: { select: { visSessionFact: true, visDatetime: true, visSessionName: true, visSongListVenue: true } },
        _count: { select: { registrations: true } },
      },
    }),
    auth(),
  ]);

  if (!session) notFound();

  const isAdmin = authSession?.user?.id === session.sessionAdminId;
  const startDate = new Date(session.startsAt);
  const isPast = startDate < new Date();

  // Google Calendar link
  const gcalFormat = (d: Date) => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const gcalEnd = new Date(startDate.getTime() + (session.durationMinutes ?? 120) * 60 * 1000);
  const gcalLocation = session.venue?.address ?? session.venue?.name ?? '';
  const gcalDetails = t('session.gcalDetails', { url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://nearjam.app'}/${locale}/sessions/${id}` });
  const gcalUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(session.title)}&dates=${gcalFormat(startDate)}/${gcalFormat(gcalEnd)}&details=${encodeURIComponent(gcalDetails)}&location=${encodeURIComponent(gcalLocation)}`;

  // Check if current user is registered
  let isRegistered = false;
  let myProfileId: string | null = null;
  let myRegistration: { id: string; paymentStatus: string | null; status: string } | null = null;
  if (authSession?.user?.id) {
    const profile = await prisma.musicianProfile.findUnique({
      where: { userId: authSession.user.id },
      select: { id: true },
    });
    if (profile) {
      myProfileId = profile.id;
      const reg = await prisma.jamSessionRegistration.findFirst({
        where: { jamSessionId: id, musicianProfileId: profile.id },
        select: { id: true, paymentStatus: true, status: true },
      });
      isRegistered = !!reg;
      myRegistration = reg ?? null;
    }
  }

  // Participant details only visible to registered participants or admin (PRD §5.1)
  const canSeeParticipants = isAdmin || isRegistered;
  const registrations = canSeeParticipants
    ? await prisma.jamSessionRegistration.findMany({
        where: { jamSessionId: id },
        include: {
          musicianProfile: {
            select: {
              id: true,
              userId: true,
              user: { select: { id: true, nickname: true, image: true } },
              instruments: { select: { instrument: true } },
            },
          },
        },
      })
    : [];

  void myProfileId;

  // この会場の他の今後のセッション
  const otherVenueSessions = session.venueId
    ? await prisma.jamSession.findMany({
        where: {
          venueId: session.venueId,
          id: { not: id },
          startsAt: { gte: new Date() },
        },
        orderBy: { startsAt: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          startsAt: true,
          durationMinutes: true,
          ticketPriceYen: true,
        },
      })
    : [];

  const gcalEnd2 = new Date(startDate.getTime() + (session.durationMinutes ?? 120) * 60 * 1000);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: session.title,
    startDate: startDate.toISOString(),
    endDate: gcalEnd2.toISOString(),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: session.isSyncroom
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    ...(session.venue ? {
      location: {
        '@type': 'MusicVenue',
        name: session.venue.name,
        ...(session.venue.address ? { address: session.venue.address } : {}),
      },
    } : {}),
    ...(session.ticketPriceYen != null ? {
      offers: {
        '@type': 'Offer',
        price: session.ticketPriceYen,
        priceCurrency: 'JPY',
        availability: 'https://schema.org/InStock',
      },
    } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <div className="max-w-3xl space-y-8">
      <div>
        <Link href={`/${locale}/sessions`} className="text-sm text-violet-600 hover:underline mb-3 inline-block">
          ← {t('session.title')}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">{session.title}</h1>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant="genre">{t(`session.formats.${session.format}`)}</Badge>
            {session.isSyncroom && <Badge variant="syncroom">SYNCROOM</Badge>}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <ShareButton
            title={session.title}
            url={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://nearjam.app'}/${locale}/sessions/${id}`}
          />
          <a
            href={gcalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {t('session.addToCalendar')}
          </a>
        </div>
      </div>

      {/* Date/time/location */}
      <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-700">
        <div>
          <p className="font-medium">📅 {t('session.startTime')}</p>
          <p className="mt-0.5 text-gray-600">
            {startDate.toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {session.durationMinutes && ` (${session.durationMinutes}${t('common.minutes')})`}
          </p>
        </div>

        {session.venue && (
          <div>
            <p className="font-medium">📍 {t('session.venue')}</p>
            <Link href={`/${locale}/venues/${session.venue.id}`} className="mt-0.5 text-violet-600 hover:underline block">
              {session.venue.name}
            </Link>
            {session.venue.nearestStation && (
              <p className="text-gray-500 text-xs">{session.venue.nearestStation}</p>
            )}
            {session.venue.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.venue.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-violet-500 hover:underline"
              >
                {t('session.viewMap')}
              </a>
            )}
          </div>
        )}

        {session.studio && !session.venue && (
          <div>
            <p className="font-medium">🎵 {t('session.studio')}</p>
            <Link href={`/${locale}/studios/${session.studio.id}`} className="mt-0.5 text-violet-600 hover:underline block">
              {session.studio.name}
            </Link>
          </div>
        )}

        {session.maxParticipants && (
          <div>
            <p className="font-medium">👥 {t('session.maxParticipants')}</p>
            <p className="mt-0.5 text-gray-600">
              {t('session.participants', { n: session._count.registrations })}/{session.maxParticipants}
            </p>
            {(() => {
              const pct = Math.min(100, Math.round((session._count.registrations / session.maxParticipants!) * 100));
              const isFull = session._count.registrations >= session.maxParticipants!;
              return (
                <div className="mt-1.5">
                  <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isFull ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {isFull && (
                    <p className="text-xs text-red-600 font-medium mt-0.5">
                      {t('session.full')}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Mood flags */}
      {session.moodFlags.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">{t('session.moodFlags')}</p>
          <MoodFlagBadges flags={session.moodFlags} />
        </div>
      )}

      {/* Description (hide internal tendency markers from bot-generated sessions) */}
      {session.description && !session.description.includes('[tendency:') && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">{t('session.description')}</p>
          <div className="text-sm text-gray-600 prose prose-sm max-w-none">
            <ReactMarkdown>{session.description}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Auto-generated from recurring session info */}
      {session.description?.includes('[tendency:') && session.venue && (
        <div className="rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-sm">
          <p className="text-violet-700 font-medium mb-1">{t('session.recurringSession')}</p>
          <p className="text-violet-600">
            {t('session.autoGenerated')}
            <Link href={`/${locale}/venues/${session.venue.id}`} className="underline ml-1">
              {t('session.checkVenuePage')}
            </Link>
          </p>
        </div>
      )}

      {/* Registration */}
      {session.registrationRequired && (
        <div className="flex items-center gap-4">
          <RegistrationButton
            sessionId={id}
            initialRegistered={isRegistered}
            isSignedIn={!!authSession?.user}
            locale={locale}
          />
        </div>
      )}

      {/* チケット購入セクション（有料セッションのみ） */}
      {session.ticketPriceYen && session.ticketPriceYen > 0 && authSession?.user && (
        <TicketSection
          sessionId={id}
          ticketPriceYen={session.ticketPriceYen}
          cancellationPolicy={session.cancellationPolicy as CancellationPolicy | null}
          registrationId={myRegistration?.id}
          paymentStatus={myRegistration?.paymentStatus}
          hostHasStripe={!!session.sessionAdmin?.stripeAccountId}
        />
      )}

      {/* Song queue */}
      {session.songs.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('session.songQueue')}</h2>
          <div className="space-y-2">
            {session.songs.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="text-sm font-mono text-gray-400 w-5">{idx + 1}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.song.title}</p>
                  {item.song.artist && <p className="text-xs text-gray-500">{item.song.artist}</p>}
                </div>
                {item.keyOverride && (
                  <span className="ml-auto text-xs text-violet-600">{item.keyOverride}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Admin: edit / live view link + admin panel */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Link href={`/${locale}/sessions/${id}/edit`}>
              <Button variant="secondary">{t('session.edit')}</Button>
            </Link>
            <Link href={`/${locale}/sessions/${id}/live`}>
              <Button variant="secondary">{t('session.live')}</Button>
            </Link>
          </div>
          <SessionAdminPanel sessionId={id} registrations={registrations} />
          <PrivacySettingsPanel
            sessionId={id}
            initial={session.privacySettings ?? {}}
          />
        </div>
      )}

      {/* Participants */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          {t('session.participants', { n: session._count.registrations })}
        </h2>
        {canSeeParticipants ? (
          registrations.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {registrations.map((reg) => (
                <div key={reg.id} className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
                  {reg.musicianProfile.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={reg.musicianProfile.user.image}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-violet-200 flex items-center justify-center text-violet-700 text-xs font-bold">
                      {(reg.musicianProfile.user.nickname ?? 'A')[0]}
                    </div>
                  )}
                  <div className="flex-1">
                    <Link href={`/${locale}/musicians/${reg.musicianProfile.user.id}`} className="text-sm font-medium hover:text-violet-700 hover:underline">
                      {reg.musicianProfile.user.nickname ?? 'Anonymous'}
                    </Link>
                    {reg.musicianProfile.instruments.length > 0 && (
                      <div className="text-xs text-gray-500">
                        {reg.musicianProfile.instruments.slice(0, 2).map(i => i.instrument).join(' / ')}
                      </div>
                    )}
                    {isPast && isRegistered && reg.musicianProfile.user.id !== authSession?.user?.id && (
                      <KudosForm
                        sessionId={id}
                        targetUserId={reg.musicianProfile.user.id}
                        targetName={reg.musicianProfile.user.nickname ?? 'Anonymous'}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t('session.noParticipantsYet')}</p>
          )
        ) : (
          <p className="text-sm text-gray-400 italic">{t('session.participantsPrivate')}</p>
        )}
      </section>

      {/* 匿名フィードバック（セッション終了後・参加者のみ） */}
      {isPast && isRegistered && (
        <section className="rounded-lg border border-dashed p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-2">{t('session.feedback.title')}</h2>
          <p className="text-xs text-gray-500 mb-3">{t('session.feedback.toSession')}</p>
          <FeedbackForm sessionId={id} toUserId={session.sessionAdminId} />
        </section>
      )}

      {/* この会場の他のセッション */}
      {otherVenueSessions.length > 0 && session.venue && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            📅 {t('session.moreSessionsAt', { venue: session.venue.name })}
          </h2>
          <div className="space-y-2">
            {otherVenueSessions.map((s) => (
              <Link
                key={s.id}
                href={`/${locale}/sessions/${s.id}`}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(s.startsAt).toLocaleDateString(locale, {
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {s.durationMinutes && ` (${s.durationMinutes}${t('common.minutes')})`}
                  </p>
                </div>
                {s.ticketPriceYen != null && s.ticketPriceYen > 0 ? (
                  <span className="text-xs rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 shrink-0">
                    ¥{s.ticketPriceYen.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-xs rounded-full bg-green-100 text-green-700 px-2 py-0.5 shrink-0">
                    {t('venue.freeEntry')}
                  </span>
                )}
              </Link>
            ))}
          </div>
          <Link href={`/${locale}/venues/${session.venue.id}`} className="mt-3 inline-block text-sm text-violet-600 hover:underline">
            {t('session.viewVenuePage')}
          </Link>
        </section>
      )}
    </div>
    </>
  );
}
