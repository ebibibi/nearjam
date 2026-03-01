export const dynamic = 'force-dynamic';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('historyTitle'), description: t('historyDesc') };
}
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/Badge';
import { VisibilityControls } from '@/components/history/VisibilityControls';

export default async function ProfileHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin`);
  }

  const profile = await prisma.musicianProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) {
    redirect(`/${locale}/profile/setup`);
  }

  const logs = await prisma.performanceLog.findMany({
    where: { musicianProfileId: profile.id },
    select: {
      id: true,
      instrumentPlayed: true,
      wasSoloist: true,
      performedAt: true,
      createdAt: true,
      visParticipation: true,
      visInstrument: true,
      visSongPerformance: true,
      visCoPerformers: true,
      song: { select: { id: true, title: true, artist: true } },
      jamSession: {
        select: {
          id: true,
          startsAt: true,
          venue: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/profile`} className="text-sm text-violet-600 hover:underline">
          ← {t('profile.myProfile')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('history.title')}</h1>
      </div>

      {logs.length === 0 ? (
        <p className="text-gray-500 text-sm">{t('history.noHistory')}</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const displayDate = log.performedAt ?? log.createdAt;
            return (
              <div key={log.id} className="rounded-lg border border-gray-200 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {log.song ? (
                      <p className="font-medium text-gray-900">
                        🎵 {log.song.title}
                        {log.song.artist && (
                          <span className="font-normal text-gray-400 ml-2">— {log.song.artist}</span>
                        )}
                      </p>
                    ) : (
                      <p className="text-gray-400 italic text-sm">Unknown song</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      <Link
                        href={`/${locale}/sessions/${log.jamSession.id}`}
                        className="hover:underline text-violet-600"
                      >
                        {log.jamSession.venue?.name ?? t('session.noVenue')}
                      </Link>
                      <span className="mx-2 text-gray-300">·</span>
                      {displayDate.toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {log.wasSoloist && (
                      <Badge variant="verified">{t('history.soloistBadge')}</Badge>
                    )}
                  </div>
                </div>
                {log.instrumentPlayed && (
                  <p className="text-xs text-gray-500">
                    {t('history.instrument')}: {log.instrumentPlayed}
                  </p>
                )}
                <VisibilityControls
                  logId={log.id}
                  initial={{
                    visParticipation: log.visParticipation,
                    visInstrument: log.visInstrument,
                    visSongPerformance: log.visSongPerformance,
                    visCoPerformers: log.visCoPerformers,
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
