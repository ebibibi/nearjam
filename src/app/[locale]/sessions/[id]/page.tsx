export const dynamic = 'force-dynamic';
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
        songs: {
          orderBy: { orderIndex: 'asc' },
          include: { song: { select: { id: true, title: true, artist: true, genre: true } } },
        },
        _count: { select: { registrations: true } },
      },
    }),
    auth(),
  ]);

  if (!session) notFound();

  const isAdmin = authSession?.user?.id === session.sessionAdminId;
  const startDate = new Date(session.startsAt);

  // Check if current user is registered
  let isRegistered = false;
  let myProfileId: string | null = null;
  if (authSession?.user?.id) {
    const profile = await prisma.musicianProfile.findUnique({
      where: { userId: authSession.user.id },
      select: { id: true },
    });
    if (profile) {
      myProfileId = profile.id;
      const reg = await prisma.jamSessionRegistration.findFirst({
        where: { jamSessionId: id, musicianProfileId: profile.id },
      });
      isRegistered = !!reg;
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
              user: { select: { nickname: true, image: true } },
              instruments: { select: { instrument: true } },
            },
          },
        },
      })
    : [];

  void myProfileId;

  return (
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

      {/* Description */}
      {session.description && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">{t('session.description')}</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{session.description}</p>
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

      {/* Admin: live view link + admin panel */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <Link href={`/${locale}/sessions/${id}/live`}>
              <Button variant="secondary">{t('session.live')}</Button>
            </Link>
          </div>
          <SessionAdminPanel sessionId={id} registrations={registrations} />
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
                <div key={reg.id} className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5">
                  {reg.musicianProfile.user.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={reg.musicianProfile.user.image}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  )}
                  <span className="text-sm">{reg.musicianProfile.user.nickname ?? 'Anonymous'}</span>
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
    </div>
  );
}
