import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RRule } from 'rrule'
import { z } from 'zod'

const createSchema = z.object({
  venueId: z.string().optional(),
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  rrule: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().int().min(30).max(480).default(120),
  format: z.enum(['OPEN', 'INVITE', 'THEME']).default('OPEN'),
  maxParticipants: z.number().int().min(2).max(200).optional(),
  isSyncroom: z.boolean().default(false),
  moodFlags: z.array(z.string()).default([]),
})

// GET /api/v1/session-series — 自分がホストのシリーズ一覧
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const series = await prisma.sessionSeries.findMany({
    where: { hostId: session.user.id, isActive: true },
    include: {
      venue: { select: { id: true, name: true } },
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(series)
}

// POST /api/v1/session-series — 新規シリーズ作成
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

  // RRULE バリデーション
  try {
    RRule.fromString(parsed.data.rrule)
  } catch {
    return NextResponse.json({ error: 'Invalid rrule string' }, { status: 400 })
  }

  const series = await prisma.sessionSeries.create({
    data: {
      hostId: session.user.id,
      ...parsed.data,
    },
    include: {
      venue: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(series, { status: 201 })
}
