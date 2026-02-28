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
            {t(`travelRanges.${Math.min(999, Math.max(5, profile.travelRadiusKm)).toString()}`)}
          </span>
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

      {profile.coverageAreas.length > 0 && (
        <div>
          <p className="font-medium text-gray-900 mb-2">{t('coverageAreas.title')}</p>
          <div className="space-y-1">
            {profile.coverageAreas.map((area) => (
              <div key={area.id} className="flex items-center gap-2 text-sm text-gray-700">
                {area.isSyncroom ? '💻' : '📍'}
                <span>{area.areaLabel}</span>
                {area.isHome && <span className="text-xs text-violet-600">(home)</span>}
                {area.syncroomNotes && <span className="text-xs text-gray-400">{area.syncroomNotes}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
