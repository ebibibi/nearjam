import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/api-utils'

const DIFFICULTY_MAP: Record<string, string[]> = {
  BEGINNER:     ['EASY', 'VARIES'],
  INTERMEDIATE: ['EASY', 'MEDIUM', 'VARIES'],
  ADVANCED:     ['MEDIUM', 'HARD', 'VARIES'],
  ANY:          ['EASY', 'MEDIUM', 'HARD', 'VARIES'],
}

/**
 * 楽曲レコメンデーション
 * ?type=nearby  — 近くで演奏されたがウィッシュリスト未登録（デフォルト）
 * ?type=practice — スキルレベル範囲内・未演奏・エリアで人気の曲
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAuth()
  if ('status' in authResult) return authResult
  const { userId } = authResult

  const type = req.nextUrl.searchParams.get('type') ?? 'nearby'

  const profile = await prisma.musicianProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      skillLevel: true,
      coverageAreas: { where: { isPublic: true }, select: { areaLabel: true }, take: 3 },
      wishlist: { select: { songId: true } },
    },
  })

  if (!profile) return err('Profile not found. Please set up your profile first.', 404)

  const wishlistSongIds = profile.wishlist.map((w) => w.songId)
  const allowedDifficulties = DIFFICULTY_MAP[profile.skillLevel] ?? DIFFICULTY_MAP['ANY']
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  if (type === 'practice') {
    // 「練習して挑める曲」: スキルレベル範囲内 + 未演奏 + エリアで人気
    const alreadyPlayedLogs = await prisma.performanceLog.findMany({
      where: { musicianProfileId: profile.id },
      select: { songId: true },
      distinct: ['songId'],
    })
    const alreadyPlayedSongIds = alreadyPlayedLogs
      .map((l) => l.songId)
      .filter((id): id is string => id !== null)

    const excludeSongIds = [...new Set([...wishlistSongIds, ...alreadyPlayedSongIds])]

    // 直近90日間に演奏された曲でスキルレベル適合のもの
    const popularSongs = await prisma.performanceLog.groupBy({
      by: ['songId'],
      where: {
        songId: { not: null, notIn: excludeSongIds },
        performedAt: { gte: ninetyDaysAgo },
      },
      _count: { songId: true },
      orderBy: { _count: { songId: 'desc' } },
      take: 30,
    })

    const songIds = popularSongs
      .map((p) => p.songId)
      .filter((id): id is string => id !== null)

    if (songIds.length === 0) return ok([])

    // 難易度フィルタ: 現在のスキルより +1 段階まで（BEGINNER は EASY のみ → MEDIUM まで含む）
    const practiceUpperMap: Record<string, string[]> = {
      BEGINNER:     ['EASY', 'MEDIUM', 'VARIES'],
      INTERMEDIATE: ['EASY', 'MEDIUM', 'HARD', 'VARIES'],
      ADVANCED:     ['MEDIUM', 'HARD', 'VARIES'],
      ANY:          ['EASY', 'MEDIUM', 'HARD', 'VARIES'],
    }
    const practiceDifficulties = practiceUpperMap[profile.skillLevel] ?? practiceUpperMap['ANY']

    const songs = await prisma.song.findMany({
      where: {
        id: { in: songIds },
        difficulty: { in: practiceDifficulties as ('EASY' | 'MEDIUM' | 'HARD' | 'VARIES')[] },
      },
      select: {
        id: true, title: true, artist: true, genre: true,
        difficulty: true, typicalKey: true, wishlistCount: true,
      },
    })

    const countMap = new Map(popularSongs.map((p) => [p.songId, p._count.songId]))
    const sorted = songs.sort((a, b) => (countMap.get(b.id) ?? 0) - (countMap.get(a.id) ?? 0))

    return ok(sorted.slice(0, 20).map((song) => ({
      ...song,
      playedNearby: countMap.get(song.id) ?? 0,
      reason: `あなたのレベルで挑戦できる曲！近くで${countMap.get(song.id) ?? 0}回演奏されています`,
    })))
  }

  // デフォルト: nearby — 近くで演奏されたがウィッシュリスト未登録
  const popularSongs = await prisma.performanceLog.groupBy({
    by: ['songId'],
    where: {
      songId: { not: null, notIn: wishlistSongIds },
      performedAt: { gte: ninetyDaysAgo },
    },
    _count: { songId: true },
    orderBy: { _count: { songId: 'desc' } },
    take: 30,
  })

  const songIds = popularSongs
    .map((p) => p.songId)
    .filter((id): id is string => id !== null)

  if (songIds.length === 0) return ok([])

  const songs = await prisma.song.findMany({
    where: {
      id: { in: songIds },
      difficulty: { in: allowedDifficulties as ('EASY' | 'MEDIUM' | 'HARD' | 'VARIES')[] },
    },
    select: {
      id: true, title: true, artist: true, genre: true,
      difficulty: true, typicalKey: true, wishlistCount: true,
    },
  })

  const countMap = new Map(popularSongs.map((p) => [p.songId, p._count.songId]))
  const sorted = songs.sort((a, b) => (countMap.get(b.id) ?? 0) - (countMap.get(a.id) ?? 0))

  return ok(sorted.slice(0, 20).map((song) => ({
    ...song,
    playedNearby: countMap.get(song.id) ?? 0,
    reason: `近くで${countMap.get(song.id) ?? 0}回演奏されています`,
  })))
}
