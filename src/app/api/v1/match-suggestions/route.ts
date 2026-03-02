import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/api-utils'

/**
 * 組み合わせマッチング提案
 * 「この2人は共通曲 N 曲あるのに一緒にやったことがない」
 * LLM なし — SQL combinatorics で実装
 */
export async function GET() {
  const authResult = await requireAuth()
  if ('status' in authResult) return authResult
  const { userId } = authResult

  const profile = await prisma.musicianProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      wishlist: { select: { songId: true } },
    },
  })

  if (!profile) return err('Profile not found', 404)
  if (profile.wishlist.length === 0) return ok([])

  const mySongIds = profile.wishlist.map((w) => w.songId)

  // 自分のウィッシュリスト曲を持つ他のミュージシャンを検索
  const othersWithSharedSongs = await prisma.songWish.findMany({
    where: {
      songId: { in: mySongIds },
      musicianProfile: { userId: { not: userId } },
    },
    select: {
      songId: true,
      musicianProfile: {
        select: {
          id: true,
          user: {
            select: { id: true, nickname: true, image: true },
          },
          instruments: { select: { instrument: true }, take: 3 },
          skillLevel: true,
        },
      },
    },
  })

  // プロフィールID ごとに共通曲をグループ化
  const profileMap = new Map<
    string,
    { profile: typeof othersWithSharedSongs[number]['musicianProfile']; sharedSongs: string[] }
  >()

  for (const wish of othersWithSharedSongs) {
    const pid = wish.musicianProfile.id
    if (!profileMap.has(pid)) {
      profileMap.set(pid, { profile: wish.musicianProfile, sharedSongs: [] })
    }
    profileMap.get(pid)!.sharedSongs.push(wish.songId)
  }

  // 一緒にセッションしたことがある人を除外
  const coPerformers = await prisma.performanceLog.findMany({
    where: { jamSession: { registrations: { some: { musicianProfile: { userId } } } } },
    select: { musicianProfileId: true },
    distinct: ['musicianProfileId'],
  })
  const coPerformerIds = new Set(coPerformers.map((p) => p.musicianProfileId))
  coPerformerIds.add(profile.id)

  // 共通曲が3曲以上 & まだ一緒にやってない人を提案
  const suggestions = Array.from(profileMap.values())
    .filter((m) => !coPerformerIds.has(m.profile.id) && m.sharedSongs.length >= 3)
    .sort((a, b) => b.sharedSongs.length - a.sharedSongs.length)
    .slice(0, 10)

  // 共通曲のタイトルを取得
  const allSharedSongIds = [...new Set(suggestions.flatMap((s) => s.sharedSongs))]
  const songs = await prisma.song.findMany({
    where: { id: { in: allSharedSongIds } },
    select: { id: true, title: true, artist: true },
  })
  const songTitleMap = new Map(songs.map((s) => [s.id, s]))

  const result = suggestions.map((m) => ({
    musicianProfileId: m.profile.id,
    user: m.profile.user,
    instruments: m.profile.instruments.map((i) => i.instrument),
    skillLevel: m.profile.skillLevel,
    sharedSongCount: m.sharedSongs.length,
    sharedSongs: m.sharedSongs.slice(0, 5).map((id) => songTitleMap.get(id)),
    reason: `${m.sharedSongs.length} shared wishlist songs`,
  }))

  return ok(result)
}
