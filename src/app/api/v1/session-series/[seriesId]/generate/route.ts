import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RRule } from 'rrule'
import { z } from 'zod'

const generateSchema = z.object({
  fromDate: z.string(), // ISO date string
  toDate: z.string(),   // ISO date string (inclusive)
})

// POST /api/v1/session-series/[seriesId]/generate
// 指定期間の JamSession インスタンスを生成する
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { seriesId } = await params

  const series = await prisma.sessionSeries.findUnique({
    where: { id: seriesId },
  })

  if (!series) {
    return NextResponse.json({ error: 'Series not found' }, { status: 404 })
  }

  if (series.hostId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const from = new Date(parsed.data.fromDate)
  const to = new Date(parsed.data.toDate)
  to.setHours(23, 59, 59, 999)

  // rrule で発生日を計算
  const rule = RRule.fromString(series.rrule)
  const occurrences = rule.between(from, to, true)

  if (occurrences.length === 0) {
    return NextResponse.json({ created: 0, sessions: [] })
  }

  const [startHour, startMinute] = series.startTime.split(':').map(Number)

  // 既存インスタンスと重複しないよう確認
  const existing = await prisma.jamSession.findMany({
    where: {
      sessionSeriesId: seriesId,
      startsAt: { gte: from, lte: to },
    },
    select: { startsAt: true },
  })

  const existingDates = new Set(
    existing.map((s) => s.startsAt.toDateString())
  )

  const newOccurrences = occurrences.filter(
    (date) => !existingDates.has(date.toDateString())
  )

  const created = await prisma.$transaction(
    newOccurrences.map((date) => {
      const startsAt = new Date(date)
      startsAt.setHours(startHour, startMinute, 0, 0)

      return prisma.jamSession.create({
        data: {
          sessionAdminId: series.hostId,
          sessionSeriesId: seriesId,
          venueId: series.venueId ?? undefined,
          title: series.title,
          description: series.description ?? undefined,
          startsAt,
          durationMinutes: series.durationMinutes,
          format: series.format,
          maxParticipants: series.maxParticipants ?? undefined,
          isSyncroom: series.isSyncroom,
          moodFlags: series.moodFlags,
        },
      })
    })
  )

  return NextResponse.json({ created: created.length, sessions: created })
}
