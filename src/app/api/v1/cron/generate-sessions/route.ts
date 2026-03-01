import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 定期セッション → JamSession 自動生成 cron エンドポイント
 * POST /api/v1/cron/generate-sessions
 *
 * isActive な SessionTendency から今後 WEEKS_AHEAD 週分の JamSession を生成する。
 * 毎日 or 週次で実行することを想定。
 */

const BOT_USER_ID = 'bot-nearjam-system'
const TENDENCY_ID_PREFIX = '[tendency:'
const WEEKS_AHEAD = 8

function buildStartsAt(date: Date, startTime: string | null | undefined): Date | null {
  if (!startTime) return null
  const [h, m] = startTime.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  // JST として解釈
  const dateStr = date.toISOString().slice(0, 10)
  return new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00+09:00`)
}

function getUpcomingDates(dayOfWeek: number, weeksAhead: number): Date[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dates: Date[] = []
  for (let w = 0; w <= weeksAhead; w++) {
    const d = new Date(today)
    const diff = ((dayOfWeek - d.getDay()) + 7) % 7
    d.setDate(d.getDate() + diff + w * 7)
    if (d >= today) dates.push(new Date(d))
  }
  // 重複排除
  const seen = new Set<string>()
  return dates.filter(d => {
    const k = d.toDateString()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bot = await prisma.user.findUnique({ where: { id: BOT_USER_ID } })
  if (!bot) {
    return NextResponse.json({ error: 'Bot user not found' }, { status: 500 })
  }

  // 既存の tendency 生成セッションのキーを収集
  const existingSessions = await prisma.jamSession.findMany({
    where: {
      sessionAdminId: BOT_USER_ID,
      description: { contains: TENDENCY_ID_PREFIX },
      startsAt: { gte: new Date() },
    },
    select: { description: true, startsAt: true },
  })
  const existingKeys = new Set<string>()
  for (const s of existingSessions) {
    const match = s.description?.match(/\[tendency:([^\]]+)\]/)
    if (match) {
      existingKeys.add(`${match[1]}_${s.startsAt.toISOString().slice(0, 10)}`)
    }
  }

  const tendencies = await prisma.sessionTendency.findMany({
    where: { isActive: true, typicalDayOfWeek: { not: null } },
    include: { venue: { select: { id: true } } },
  })

  let created = 0

  for (const tendency of tendencies) {
    if (tendency.typicalDayOfWeek == null) continue
    const dates = getUpcomingDates(tendency.typicalDayOfWeek, WEEKS_AHEAD)

    for (const date of dates) {
      const startsAt = buildStartsAt(date, tendency.typicalStartTime)
      if (!startsAt || startsAt < new Date()) continue

      const dateStr = startsAt.toISOString().slice(0, 10)
      const key = `${tendency.id}_${dateStr}`
      if (existingKeys.has(key)) continue

      const description = [
        `${TENDENCY_ID_PREFIX}${tendency.id}]`,
        tendency.atmosphere ?? '',
        tendency.levelRange ? `参加レベル: ${tendency.levelRange}` : '',
        tendency.entrySystem ? `入場: ${tendency.entrySystem}` : '',
      ].filter(Boolean).join('\n').trim()

      try {
        await prisma.jamSession.create({
          data: {
            sessionAdminId: BOT_USER_ID,
            venueId: tendency.venueId ?? undefined,
            title: tendency.name,
            startsAt,
            format: 'OPEN',
            registrationRequired: false,
            description,
            moodFlags: [],
          },
        })
        existingKeys.add(key)
        created++
      } catch {
        // 重複等はスキップ
      }
    }
  }

  return NextResponse.json({ created, tendencies: tendencies.length })
}
