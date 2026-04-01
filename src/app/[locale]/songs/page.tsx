export const dynamic = 'force-dynamic';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('songsTitle'), description: t('songsDesc') };
}
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SongSearch } from '@/components/song/SongSearch';
import { ArtistSessionSearch } from '@/components/song/ArtistSessionSearch';

export default async function SongsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q: initialQuery } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations();

  const session = await auth();
  const isSignedIn = !!session?.user?.id;

  // Collect popular artists from all active tendencies (public data)
  const tendenciesWithArtists = await prisma.sessionTendency.findMany({
    where: { isActive: true, typicalArtists: { isEmpty: false } },
    select: { typicalArtists: true },
  });
  const artistCounts: Record<string, number> = {};
  for (const t of tendenciesWithArtists) {
    for (const a of t.typicalArtists) {
      artistCounts[a] = (artistCounts[a] ?? 0) + 1;
    }
  }
  const popularArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([artist]) => artist);

  let wishlistIds = new Set<string>();
  let wishlistKeys = new Map<string, string | null>();

  if (session?.user?.id) {
    const profile = await prisma.musicianProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (profile) {
      const wishes = await prisma.songWish.findMany({
        where: { musicianProfileId: profile.id },
        select: { songId: true, preferredKey: true },
      });
      wishlistIds = new Set(wishes.map((w) => w.songId));
      wishlistKeys = new Map(wishes.map((w) => [w.songId, w.preferredKey]));
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Section 1: Artist/Genre → Session search (PUBLIC) */}
      <section>
        <h1 className="text-2xl font-bold text-gray-900">{t('song.findByArtist')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {locale === 'ja'
            ? 'アーティスト名やジャンルで検索すると、そのセッションを開催している会場が見つかります。元情報のリンクからいつでも最新情報を確認できます。'
            : 'Search by artist or genre to find venues hosting those sessions. Every result links directly to the original source.'}
        </p>
        <div className="mt-4">
          <ArtistSessionSearch popularArtists={popularArtists} />
        </div>
      </section>

      {/* Section 2: Song search + wishlist (REQUIRES AUTH) */}
      <section>
        <h2 className="text-xl font-bold text-gray-900">{t('song.findBySong')}</h2>
        {isSignedIn ? (
          <div className="mt-4">
            <SongSearch
              isSignedIn={isSignedIn}
              wishlistIds={wishlistIds}
              wishlistKeys={wishlistKeys}
              initialQuery={initialQuery}
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">{t('song.signInToWishlist')}</p>
        )}
      </section>
    </div>
  );
}
