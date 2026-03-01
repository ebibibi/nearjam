import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api-utils'
import { z } from 'zod'

const createSchema = z.object({
  venueId: z.string().optional(),
  availableDate: z.string(), // ISO date
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().min(60).max(480).default(120),
  songIds: z.array(z.string()).min(1).max(50),
  instruments: z.array(z.string()).min(1).max(10),
  notes: z.string().max(500).optional(),
})

// GET /api/v1/host-availability — 自分の利用可能日一覧
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const availabilities = await prisma.hostAvailability.findMany({
    where: { hostId: session.user.id, isActive: true },
    orderBy: { availableDate: 'asc' },
  })

  return ok(availabilities)
}

// POST /api/v1/host-availability — 利用可能日を登録してマッチング通知を送る
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const availability = await prisma.hostAvailability.create({
    data: {
      hostId: session.user.id,
      venueId: parsed.data.venueId,
      availableDate: new Date(parsed.data.availableDate),
      startTime: parsed.data.startTime,
      durationMinutes: parsed.data.durationMinutes,
      songIds: parsed.data.songIds,
      instruments: parsed.data.instruments,
      notes: parsed.data.notes,
    },
  })

  // マッチするミュージシャンを検索してバックグラウンドで通知
  void sendHostMatchNotifications(session.user.id, availability.id, parsed.data.songIds)

  return NextResponse.json(availability, { status: 201 })
}

async function sendHostMatchNotifications(
  hostId: string,
  availabilityId: string,
  songIds: string[]
) {
  // 共通ウィッシュリスト曲を持つミュージシャンを検索
  const matches = await prisma.songWish.findMany({
    where: {
      songId: { in: songIds },
      musicianProfile: { userId: { not: hostId } },
    },
    select: {
      musicianProfile: {
        select: { userId: true },
      },
    },
    distinct: ['musicianProfileId'],
  })

  const targetUserIds = [...new Set(matches.map((m) => m.musicianProfile.userId))]

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(8, 0, 0, 0)

  if (targetUserIds.length === 0) return

  await prisma.notification.createMany({
    data: targetUserIds.map((uid) => ({
      userId: uid,
      type: 'MATCH_SESSION' as const,
      payload: {
        type: 'host_availability',
        availabilityId,
        sharedSongCount: songIds.length,
      },
      scheduledFor: tomorrow,
    })),
    skipDuplicates: true,
  })
}
