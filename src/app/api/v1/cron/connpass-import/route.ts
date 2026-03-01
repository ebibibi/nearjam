import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Connpass イベント定期インポート cron エンドポイント
 * POST /api/v1/cron/connpass-import
 *
 * Connpass 公開 API からジャムセッション関連イベントを取得して
 * JamSession テーブルに保存する。
 */

const BOT_USER_ID = 'bot-nearjam-system'
const CONNPASS_ID_PREFIX = '[connpass:'

const KEYWORDS = [
  'ジャムセッション',
  'ジャズセッション',
  'セッション jazz',
  'セッション blues',
  'セッション funk',
]

interface ConnpassEvent {
  event_id: number
  title: string
  catch: string
  event_url: string
  started_at: string
  ended_at: string
  place: string
  address: string
  lat: string | null
  lon: string | null
  limit: number | null
}

interface ConnpassApiResponse {
  events: ConnpassEvent[]
}

async function fetchEvents(keyword: string): Promise<ConnpassEvent[]> {
  const params = new URLSearchParams({ keyword, count: '50', order: '2' })
  const res = await fetch(`https://connpass.com/api/v1/event/?${params}`, {
    headers: { 'User-Agent': 'NearJamBot/1.0' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) return []
  const data: ConnpassApiResponse = await res.json()
  return data.events ?? []
}

async function getImportedIds(): Promise<Set<number>> {
  const sessions = await prisma.jamSession.findMany({
    where: { sessionAdminId: BOT_USER_ID, description: { contains: CONNPASS_ID_PREFIX } },
    select: { description: true },
  })
  const ids = new Set<number>()
  for (const s of sessions) {
    const match = s.description?.match(/\[connpass:(\d+)\]/)
    if (match) ids.add(parseInt(match[1], 10))
  }
  return ids
}

async function upsertVenue(event: ConnpassEvent): Promise<string | null> {
  if (!event.place) return null
  const existing = await prisma.venue.findFirst({ where: { name: event.place } })
  if (existing) return existing.id
  const created = await prisma.venue.create({
    data: {
      name: event.place,
      address: event.address || undefined,
      lat: event.lat ? parseFloat(event.lat) : undefined,
      lng: event.lon ? parseFloat(event.lon) : undefined,
    },
  })
  return created.id
}

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Bot ユーザー確認（存在しなければスキップ）
  const bot = await prisma.user.findUnique({ where: { id: BOT_USER_ID } })
  if (!bot) {
    return NextResponse.json({ error: 'Bot user not found. Run seed-bot-user.ts first.' }, { status: 500 })
  }

  const importedIds = await getImportedIds()
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const keyword of KEYWORDS) {
    try {
      const events = await fetchEvents(keyword)

      for (const event of events) {
        if (importedIds.has(event.event_id)) { skipped++; continue }

        const startsAt = new Date(event.started_at)
        if (isNaN(startsAt.getTime()) || startsAt < sixMonthsAgo) { skipped++; continue }

        try {
          const venueId = await upsertVenue(event)
          const durationMs = event.ended_at
            ? new Date(event.ended_at).getTime() - startsAt.getTime()
            : null
          const durationMinutes = durationMs && durationMs > 0
            ? Math.round(durationMs / 60_000)
            : undefined

          const description = [
            event.catch || '',
            '',
            `${CONNPASS_ID_PREFIX}${event.event_id}] 元の Connpass ページ: ${event.event_url}`,
          ].join('\n').trim()

          await prisma.jamSession.create({
            data: {
              sessionAdminId: BOT_USER_ID,
              venueId: venueId ?? undefined,
              title: event.title.slice(0, 200),
              startsAt,
              durationMinutes,
              format: 'OPEN',
              registrationRequired: false,
              maxParticipants: event.limit ?? undefined,
              description,
              moodFlags: [],
            },
          })
          importedIds.add(event.event_id)
          imported++
        } catch {
          errors++
        }
      }
    } catch {
      // keyword ごとのエラーは継続
    }
  }

  return NextResponse.json({ imported, skipped, errors })
}
