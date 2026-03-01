export const dynamic = 'force-dynamic';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('profile');

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin`);
  }

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, nickname: true, email: true, image: true },
    }),
    prisma.musicianProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        instruments: true,
        genres: true,
        coverageAreas: {
          orderBy: [{ isHome: 'desc' }, { createdAt: 'asc' }],
          select: { id: true, areaLabel: true, isHome: true, isSyncroom: true, syncroomNotes: true },
        },
        wishlist: {
          include: { song: { select: { id: true, title: true, artist: true } } },
          orderBy: { addedAt: 'desc' },
          take: 10,
        },
      },
    }),
  ]);

  if (!profile) {
    redirect(`/${locale}/profile/setup`);
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.nickname ?? ''}
              className="h-16 w-16 rounded-full object-cover"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user?.nickname ?? t('myProfile')}</h1>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
        <Link href={`/${locale}/profile/setup`}>
          <Button variant="secondary" size="sm">{t('edit')}</Button>
        </Link>
      </div>

      {profile.bio && (
        <p className="text-gray-700 text-sm">{profile.bio}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        <div>
          <p className="font-medium text-gray-900 mb-1">{t('skillLevel')}</p>
          <Badge variant="genre">{t(`skillLevels.${profile.skillLevel}`)}</Badge>
        </div>
        <div>
          <p className="font-medium text-gray-900 mb-1">{t('sessionGoal')}</p>
          <Badge variant="genre">{t(`sessionGoals.${profile.sessionGoal}`)}</Badge>
        </div>
        <div>
          <p className="font-medium text-gray-900 mb-1">{t('travelRange')}</p>
          <span className="text-gray-600">
            {profile.travelRadiusKm >= 100
              ? t('travelRanges.999')
              : profile.travelRadiusKm >= 25
              ? t('travelRanges.30')
              : profile.travelRadiusKm >= 10
              ? t('travelRanges.15')
              : t('travelRanges.5')}
          </span>
        </div>
        {profile.yearsPlaying != null && (
          <div>
            <p className="font-medium text-gray-900 mb-1">{t('setup.yearsPlaying')}</p>
            <span className="text-gray-600">{profile.yearsPlaying} {profile.yearsPlaying === 1 ? 'year' : 'years'}</span>
          </div>
        )}
        <div>
          <p className="font-medium text-gray-900 mb-1">{t('playVolumePrefLabel')}</p>
          <span className="text-gray-600">{t(`playVolumePrefs.${profile.playVolumePref}`)}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900 mb-1">{t('challengePrefLabel')}</p>
          <span className="text-gray-600">{t(`challengePrefs.${profile.challengePref}`)}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900 mb-1">{t('tempoPrefLabel')}</p>
          <span className="text-gray-600">{t(`tempoPrefs.${profile.tempoPref}`)}</span>
        </div>
      </div>

      {profile.instruments.length > 0 && (
        <div>
          <p className="font-medium text-gray-900 mb-2">{t('instruments')}</p>
          <div className="flex flex-wrap gap-2">
            {profile.instruments.map((i) => (
              <span key={i.id} className="rounded-full bg-violet-100 text-violet-700 px-3 py-1 text-sm">
                {i.instrument}{i.proficiency ? ` (${i.proficiency})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.genres.length > 0 && (
        <div>
          <p className="font-medium text-gray-900 mb-2">{t('genres')}</p>
          <div className="flex flex-wrap gap-2">
            {profile.genres.map((g) => (
              <Badge key={g.id} variant="genre">{g.genre}</Badge>
            ))}
          </div>
        </div>
      )}

      {profile.coverageAreas.some((a) => !a.isSyncroom) && (
        <div>
          <p className="font-medium text-gray-900 mb-2">{t('coverageAreas.title')}</p>
          <div className="space-y-1">
            {profile.coverageAreas.filter((a) => !a.isSyncroom).map((area) => (
              <div key={area.id} className="flex items-center gap-2 text-sm text-gray-700">
                <span>📍</span>
                <span>{area.areaLabel}</span>
                {area.isHome && <span className="text-xs text-violet-600">{t('coverageAreas.home')}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {profile.coverageAreas.some((a) => a.isSyncroom) && (
        <div>
          <p className="font-medium text-gray-900 mb-2">💻 {t('syncroomAvailable')}</p>
          <div className="space-y-1">
            {profile.coverageAreas.filter((a) => a.isSyncroom).map((area) => (
              <div key={area.id} className="text-sm text-gray-700">
                {area.syncroomNotes && <span className="text-gray-500">{area.syncroomNotes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wishlist preview */}
      {profile.wishlist.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium text-gray-900">{t('wishlist')}</p>
            <Link href={`/${locale}/songs`} className="text-xs text-violet-600 hover:underline">
              {t('viewAllSongs')}
            </Link>
          </div>
          <div className="space-y-1">
            {profile.wishlist.map((wish) => (
              <div key={wish.id} className="flex items-center gap-2 text-sm text-gray-700">
                <span>🎵</span>
                <span className="font-medium">{wish.song.title}</span>
                {wish.song.artist && <span className="text-gray-400">— {wish.song.artist}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-4">
        <Link href={`/${locale}/profile/history`} className="text-sm text-violet-600 hover:underline">
          🎸 {t('myHistory')} →
        </Link>
        <Link href={`/${locale}/connections`} className="text-sm text-violet-600 hover:underline">
          🤝 {t('connections')} →
        </Link>
      </div>

      {/* SNS links */}
      {profile.snsLinks && Object.keys(profile.snsLinks as Record<string, string>).some((k) => (profile.snsLinks as Record<string, string>)[k]) && (
        <div>
          <p className="font-medium text-gray-900 mb-2">{t('snsLinks')}</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(profile.snsLinks as Record<string, string>).map(([platform, url]) =>
              url ? (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-violet-600 hover:underline capitalize"
                >
                  {platform === 'youtube' ? '▶️' : platform === 'instagram' ? '📸' : platform === 'x' ? '🐦' : platform === 'soundcloud' ? '☁️' : platform === 'tiktok' ? '🎵' : '🔗'} {platform}
                </a>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}
