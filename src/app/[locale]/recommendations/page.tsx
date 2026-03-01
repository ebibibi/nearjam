import { getTranslations, setRequestLocale } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('recommendTitle'), description: t('recommendDesc') };
}

export default async function RecommendationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`);

  const t = await getTranslations({ locale, namespace: 'recommendation' });
  const userId = session.user.id;

  const profile = await prisma.musicianProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      skillLevel: true,
      wishlist: { select: { songId: true } },
    },
  });

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">{t('profileRequired')}</p>
        <Link href={`/${locale}/profile/setup`} className="mt-4 inline-block text-violet-600 hover:underline">
          {t('setupProfile')}
        </Link>
      </div>
    );
  }

  const wishlistSongIds = profile.wishlist.map((w) => w.songId);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const difficultyMap: Record<string, string[]> = {
    BEGINNER: ['EASY', 'MEDIUM', 'VARIES'],
    INTERMEDIATE: ['EASY', 'MEDIUM', 'HARD', 'VARIES'],
    ADVANCED: ['MEDIUM', 'HARD', 'VARIES'],
    ANY: ['EASY', 'MEDIUM', 'HARD', 'VARIES'],
  };
  const allowedDifficulties = (difficultyMap[profile.skillLevel] ?? ['EASY', 'MEDIUM', 'HARD', 'VARIES']) as ('EASY' | 'MEDIUM' | 'HARD' | 'VARIES')[];

  const popularSongs = await prisma.performanceLog.groupBy({
    by: ['songId'],
    where: {
      songId: { not: null, notIn: wishlistSongIds },
      performedAt: { gte: ninetyDaysAgo },
    },
    _count: { songId: true },
    orderBy: { _count: { songId: 'desc' } },
    take: 30,
  });

  const songIds = popularSongs.map((p) => p.songId).filter((id): id is string => id !== null);

  const songs = songIds.length > 0
    ? await prisma.song.findMany({
        where: { id: { in: songIds }, difficulty: { in: allowedDifficulties } },
        select: { id: true, title: true, artist: true, genre: true, difficulty: true, typicalKey: true },
      })
    : [];

  const countMap = new Map(popularSongs.map((p) => [p.songId, p._count.songId]));
  const sorted = songs.sort((a, b) => (countMap.get(b.id) ?? 0) - (countMap.get(a.id) ?? 0)).slice(0, 20);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
      </div>

      {sorted.length === 0 ? (
        <p className="text-gray-400 text-center py-12">{t('noRecommendations')}</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((song) => {
            const count = countMap.get(song.id) ?? 0;
            return (
              <div key={song.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white">
                <div>
                  <p className="font-medium text-gray-900">{song.title}</p>
                  {song.artist && <p className="text-sm text-gray-500">{song.artist}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {count}{t('playedNearby')}
                    {song.difficulty && <span className="ml-2 text-violet-500">{song.difficulty}</span>}
                    {song.typicalKey && <span className="ml-2">{song.typicalKey}</span>}
                  </p>
                </div>
                <Link
                  href={`/${locale}/songs?q=${encodeURIComponent(song.title)}`}
                  className="text-xs px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 whitespace-nowrap"
                >
                  {t('addToWishlist')}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
