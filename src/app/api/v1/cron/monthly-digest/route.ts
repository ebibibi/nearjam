import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

/**
 * 月次ダイジェスト cron エンドポイント
 * POST /api/v1/cron/monthly-digest
 * 定期セッションシリーズの先月実績をホストにメール送信
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const seriesList = await prisma.sessionSeries.findMany({
    where: { isActive: true },
    include: {
      host: { select: { email: true, nickname: true } },
      sessions: {
        where: {
          startsAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        include: {
          _count: { select: { registrations: true } },
          performanceLogs: {
            select: { songId: true },
            where: { songId: { not: null } },
          },
        },
      },
    },
  })

  let sent = 0

  for (const series of seriesList) {
    if (!series.host.email) continue
    if (series.sessions.length === 0) continue

    const totalParticipants = series.sessions.reduce(
      (acc, s) => acc + s._count.registrations,
      0
    )

    const songCountMap = new Map<string, number>()
    for (const session of series.sessions) {
      for (const log of session.performanceLogs) {
        if (log.songId) {
          songCountMap.set(log.songId, (songCountMap.get(log.songId) ?? 0) + 1)
        }
      }
    }

    const topSongIds = Array.from(songCountMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id)

    const topSongs = topSongIds.length > 0
      ? await prisma.song.findMany({
          where: { id: { in: topSongIds } },
          select: { id: true, title: true, artist: true },
        })
      : []

    const monthLabel = `${lastMonthStart.getFullYear()}年${lastMonthStart.getMonth() + 1}月`

    await sendEmail({
      to: series.host.email,
      subject: `[NearJam] ${series.title} — ${monthLabel} 月次ダイジェスト`,
      html: `
        <h2>${series.title} — ${monthLabel} 月次レポート</h2>
        <p>${series.host.nickname ?? 'ホスト'}さん、先月もお疲れさまでした！</p>
        <ul>
          <li>開催回数: <strong>${series.sessions.length}回</strong></li>
          <li>延べ参加者数: <strong>${totalParticipants}人</strong></li>
        </ul>
        ${topSongs.length > 0 ? `
          <h3>よく演奏された曲 Top ${topSongs.length}</h3>
          <ol>${topSongs.map((s) => `<li>${s.title}${s.artist ? ` / ${s.artist}` : ''}</li>`).join('')}</ol>
        ` : ''}
        <p>引き続き NearJam をよろしくお願いします！</p>
      `,
    })

    sent++
  }

  return NextResponse.json({ seriesProcessed: seriesList.length, emailsSent: sent })
}
