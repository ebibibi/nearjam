import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function MatchSuggestionsPage() {
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

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <h1 className="mb-2 text-2xl font-bold">マッチング提案</h1>
      <p className="mb-6 text-gray-500">
        あなたとウィッシュリストが重なっているミュージシャンです
      </p>
      <MatchSuggestionsList />
    </div>
  )
}

// ─── クライアントコンポーネントとして切り出し ───
// サーバー側で直接 API を呼ぶ代わりに、専用 fetch コンポーネントで実装
async function MatchSuggestionsList() {
  // サーバーコンポーネントで直接 Prisma 操作
  // (APIルートと同じロジックをSSRで実行)
  const { auth: serverAuth } = await import('@/lib/auth')
  const session = await serverAuth()
  if (!session?.user?.id) return null

  const { prisma: db } = await import('@/lib/prisma')

  const myProfile = await db.musicianProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, wishlist: { select: { songId: true } } },
  })

  if (!myProfile || myProfile.wishlist.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
        <p>ウィッシュリストに曲を追加すると、マッチングが始まります</p>
        <Link href="/songs" className="mt-3 inline-block text-blue-600 hover:underline">
          曲を探す →
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
        <p>現在マッチする候補がいません</p>
        <p className="mt-1 text-sm">ウィッシュリストを増やすとマッチングが増えます</p>
      </div>
    )
  }

  const allSharedSongIds = [...new Set(suggestions.flatMap((s) => s.sharedSongs))]
  const songs = await db.song.findMany({
    where: { id: { in: allSharedSongIds } },
    select: { id: true, title: true, artist: true },
  })
  const songMap = new Map(songs.map((s) => [s.id, s]))

  const SKILL_LABELS: Record<string, string> = {
    BEGINNER: '初心者',
    INTERMEDIATE: '中級',
    ADVANCED: '上級',
    ANY: 'レベル不問',
  }

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
                  href={`/musicians/${profile.user.id}`}
                  className="font-semibold hover:underline"
                >
                  {profile.user.nickname ?? '名前未設定'}
                </Link>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {SKILL_LABELS[profile.skillLevel] ?? profile.skillLevel}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {profile.instruments.map((i) => i.instrument).join(' · ')}
              </p>
              <p className="mt-1 text-sm text-blue-700 font-medium">
                共通曲 {sharedSongs.length}曲
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
                  <span className="text-xs text-gray-400">+{sharedSongs.length - 5}曲</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
