export const dynamic = 'force-dynamic';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SongSearch } from '@/components/song/SongSearch';

export default async function SongsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const session = await auth();
  const isSignedIn = !!session?.user?.id;

  // Fetch current user's wishlist for optimistic display
  let wishlistIds = new Set<string>();
  if (session?.user?.id) {
    const profile = await prisma.musicianProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (profile) {
      const wishes = await prisma.songWish.findMany({
        where: { musicianProfileId: profile.id },
        select: { songId: true },
      });
      wishlistIds = new Set(wishes.map((w) => w.songId));
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('song.title')}</h1>
      <SongSearch isSignedIn={isSignedIn} wishlistIds={wishlistIds} />
    </div>
  );
}
