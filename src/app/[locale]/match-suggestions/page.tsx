import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { setRequestLocale } from 'next-intl/server'

export default async function MatchSuggestionsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const profile = await prisma.musicianProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      wishlist: { select: { songId: true } },
    },
  })

  if (!profile) redirect('/profile/setup')

  const t = await getTranslations({ locale })

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <h1 className="mb-2 text-2xl font-bold">{t('musician.match.title')}</h1>
      <p className="mb-6 text-gray-500">{t('musician.match.subtitle')}</p>
      <MatchSuggestionsList locale={locale} />
    </div>
  )
}

async function MatchSuggestionsList({ locale }: { locale: string }) {
  const { auth: serverAuth } = await import('@/lib/auth')
  const session = await serverAuth()
  if (!session?.user?.id) return null

  const { prisma: db } = await import('@/lib/prisma')
  const t = await getTranslations({ locale })

  const myProfile = await db.musicianProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, wishlist: { select: { songId: true } } },
  })

  if (!myProfile || myProfile.wishlist.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
        <p>{t('musician.match.noWishlist')}</p>
        <Link href="/songs" className="mt-3 inline-block text-blue-600 hover:underline">
          {t('musician.match.browseSongs')}
        </Link>
      </div>
    )
  }

  const mySongIds = myProfile.wishlist.map((w) => w.songId)

  const othersWithSharedSongs = await db.songWish.findMany({
    where: {
      songId: { in: mySongIds },
      musicianProfile: { userId: { not: session.user.id } },
    },
    select: {
      songId: true,
      musicianProfile: {
        select: {
          id: true,
          user: { select: { id: true, nickname: true, image: true } },
          instruments: { select: { instrument: true }, take: 3 },
          skillLevel: true,
        },
      },
    },
  })

  const profileMap = new Map<string, { profile: typeof othersWithSharedSongs[number]['musicianProfile']; sharedSongs: string[] }>()
  for (const wish of othersWithSharedSongs) {
    const pid = wish.musicianProfile.id
    if (!profileMap.has(pid)) {
      profileMap.set(pid, { profile: wish.musicianProfile, sharedSongs: [] })
    }
    profileMap.get(pid)!.sharedSongs.push(wish.songId)
  }

  const coPerformers = await db.performanceLog.findMany({
    where: { jamSession: { registrations: { some: { musicianProfile: { userId: session.user.id } } } } },
    select: { musicianProfileId: true },
    distinct: ['musicianProfileId'],
  })
  const coPerformerIds = new Set(coPerformers.map((p) => p.musicianProfileId))
  coPerformerIds.add(myProfile.id)

  const suggestions = Array.from(profileMap.values())
    .filter((m) => !coPerformerIds.has(m.profile.id) && m.sharedSongs.length >= 3)
    .sort((a, b) => b.sharedSongs.length - a.sharedSongs.length)
    .slice(0, 10)

  if (suggestions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
        <p>{t('musician.match.empty')}</p>
        <p className="mt-1 text-sm">{t('musician.match.emptyHint')}</p>
      </div>
    )
  }

  const allSharedSongIds = [...new Set(suggestions.flatMap((s) => s.sharedSongs))]
  const songs = await db.song.findMany({
    where: { id: { in: allSharedSongIds } },
    select: { id: true, title: true, artist: true },
  })
  const songMap = new Map(songs.map((s) => [s.id, s]))

  return (
    <div className="space-y-4">
      {suggestions.map(({ profile, sharedSongs }) => (
        <div key={profile.id} className="rounded-lg border p-4">
          <div className="flex items-start gap-3">
            {profile.user.image && (
              <img src={profile.user.image} alt="" className="h-12 w-12 rounded-full object-cover" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/${locale}/musicians/${profile.user.id}`}
                  className="font-semibold hover:underline"
                >
                  {profile.user.nickname ?? t('musician.match.nameNotSet')}
                </Link>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {t(`musician.skillLevel.${profile.skillLevel}` as Parameters<typeof t>[0]) ?? profile.skillLevel}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {profile.instruments.map((i) => i.instrument).join(' · ')}
              </p>
              <p className="mt-1 text-sm text-blue-700 font-medium">
                {t('musician.match.sharedSongs', { n: sharedSongs.length })}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                {sharedSongs.slice(0, 5).map((id) => {
                  const song = songMap.get(id)
                  return song ? (
                    <span key={id} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      {song.title}
                    </span>
                  ) : null
                })}
                {sharedSongs.length > 5 && (
                  <span className="text-xs text-gray-400">
                    {t('musician.match.moreSongs', { n: sharedSongs.length - 5 })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
