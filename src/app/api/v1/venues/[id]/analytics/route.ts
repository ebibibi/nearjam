import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/v1/venues/[id]/analytics — 会場アナリティクス（公開）
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const venue = await prisma.venue.findUnique({
    where: { id },
    select: { id: true, name: true },
  })

  if (!venue) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
  }

  const [sessions, totalParticipants, topSongs] = await Promise.all([
    // 過去12ヶ月のセッション数（月別）
    prisma.jamSession.groupBy({
      by: ['startsAt'],
      where: {
        venueId: id,
        startsAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
      _count: { id: true },
    }),

    // 総参加者数
    prisma.jamSessionRegistration.count({
      where: { jamSession: { venueId: id } },
    }),

    // 人気曲 Top 10
    prisma.performanceLog.groupBy({
      by: ['songId'],
      where: {
        jamSession: { venueId: id },
        songId: { not: null },
      },
      _count: { songId: true },
      orderBy: { _count: { songId: 'desc' } },
      take: 10,
    }),
  ])

  // 月別集計
  const monthlyMap = new Map<string, number>()
  for (const s of sessions) {
    const month = s.startsAt.toISOString().slice(0, 7)
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + s._count.id)
  }
  const monthly = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }))

  // Top 曲の詳細
  const songIds = topSongs
    .map((s) => s.songId)
    .filter((id): id is string => id !== null)

  const songDetails = await prisma.song.findMany({
    where: { id: { in: songIds } },
    select: { id: true, title: true, artist: true, genre: true },
  })
  const songMap = new Map(songDetails.map((s) => [s.id, s]))

  const topSongsResult = topSongs
    .filter((s) => s.songId && songMap.has(s.songId))
    .map((s) => ({
      ...songMap.get(s.songId!)!,
      playCount: s._count.songId,
    }))

  return NextResponse.json({
    venue,
    totalSessions: sessions.reduce((acc, s) => acc + s._count.id, 0),
    totalParticipants,
    monthlySessions: monthly,
    topSongs: topSongsResult,
  })
}
