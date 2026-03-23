export const dynamic = 'force-dynamic';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Image from 'next/image';
import { Badge } from '@/components/ui/Badge';
import { ConnectionRequestButton } from '@/components/connection/ConnectionRequestButton';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'musician' });

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { nickname: true } }),
    prisma.musicianProfile.findUnique({
      where: { userId: id },
      select: { profileVisibility: true, instruments: { select: { instrument: true } } },
    }),
  ]);

  if (!user || !profile || profile.profileVisibility === 'PRIVATE') return {};

  const name = user.nickname ?? t('anonymous');
  const instruments = profile.instruments.map((i) => i.instrument);

  const title = user.nickname ? t('meta.title', { name }) : t('meta.titleAnon');
  const description = instruments.length > 0
    ? t('meta.descWithInstruments', { name, instruments: instruments.slice(0, 3).join(', ') })
    : t('meta.desc', { name });

  return { title, description };
}

export default async function MusicianProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('musician');

  const session = await auth();
  const viewerId = session?.user?.id;

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, nickname: true, image: true },
    }),
    prisma.musicianProfile.findUnique({
      where: { userId: id },
      select: {
        bio: true,
        skillLevel: true,
        profileVisibility: true,
        instruments: { select: { instrument: true } },
        genres: { select: { genre: true } },
        coverageAreas: {
          where: { isSyncroom: false, isPublic: true },
          select: { areaLabel: true, isHome: true },
        },
      },
    }),
  ]);

  if (!user || !profile) notFound();

  // 自分のプロフィールなら /profile にリダイレクト
  if (viewerId === id) {
    redirect(`/${locale}/profile`);
  }

  // 可視性チェック
  if (profile.profileVisibility === 'PRIVATE') {
    notFound();
  }
  if (profile.profileVisibility === 'LOGGED_IN' && !viewerId) {
    redirect(`/${locale}/auth/signin`);
  }

  // コネクション状態を取得（ログイン時のみ）
  let connectionStatus: 'none' | 'pending' | 'accepted' | 'blocked' = 'none';
  if (viewerId) {
    const [conn, block] = await Promise.all([
      prisma.connection.findFirst({
        where: {
          OR: [
            { fromUserId: viewerId, toUserId: id },
            { fromUserId: id, toUserId: viewerId },
          ],
        },
        select: { status: true },
      }),
      prisma.block.findFirst({
        where: {
          OR: [
            { blockerUserId: viewerId, blockedUserId: id },
            { blockerUserId: id, blockedUserId: viewerId },
          ],
        },
      }),
    ]);

    if (block) connectionStatus = 'blocked';
    else if (conn?.status === 'ACCEPTED') connectionStatus = 'accepted';
    else if (conn?.status === 'PENDING') connectionStatus = 'pending';
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nearjam.ebisuda.net';
  // JSON.stringify escapes all HTML special chars, making this XSS-safe
  const jsonLdString = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: user.nickname ?? undefined,
    image: user.image ?? undefined,
    url: `${appUrl}/${locale}/musicians/${id}`,
    description: profile.bio ?? undefined,
    knowsAbout: profile.instruments.map((i) => i.instrument),
  });

  return (
    <div className="max-w-2xl space-y-6">
      {/* JSON-LD: JSON.stringify ensures XSS-safe output */}
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString }} />
      <Link href={`/${locale}/sessions`} className="text-sm text-violet-600 hover:underline">
        ← {t('backToSessions')}
      </Link>

      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {user.image && (
            <Image src={user.image} alt="" width={64} height={64} className="rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.nickname ?? t('anonymous')}
            </h1>
            {profile.skillLevel && (
              <Badge variant="default" className="mt-1">
                {t(`skillLevel.${profile.skillLevel}`)}
              </Badge>
            )}
          </div>
        </div>

        {viewerId && connectionStatus !== 'blocked' && (
          <ConnectionRequestButton
            targetUserId={id}
            status={connectionStatus}
          />
        )}
      </div>

      {/* Bio */}
      {profile.bio && (
        <section>
          <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
        </section>
      )}

      {/* 楽器 */}
      {profile.instruments.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {t('instruments')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.instruments.map((i) => (
              <Badge key={i.instrument} variant="default">
                {i.instrument}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* ジャンル */}
      {profile.genres.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {t('genres')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.genres.map((g) => (
              <Badge key={g.genre} variant="genre">{g.genre}</Badge>
            ))}
          </div>
        </section>
      )}

      {/* エリア（公開設定のもののみ） */}
      {profile.coverageAreas.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {t('areas')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {profile.coverageAreas.map((a) => (
              <Badge key={a.areaLabel} variant="default">
                {a.isHome ? '🏠 ' : ''}{a.areaLabel}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
