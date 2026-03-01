import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * 自動収集ボット定期再取得 cron エンドポイント
 * POST /api/v1/cron/auto-collect
 * nextFetchAt <= now の AutoCollectionJob を処理キューに入れ、
 * HP から基本情報を再取得して SessionTendency を更新する
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const jobs = await prisma.autoCollectionJob.findMany({
    where: {
      nextFetchAt: { lte: now },
      lastStatus: { not: 'pending_review' },
    },
    include: {
      venue: { select: { id: true, websiteUrl: true, instagramUrl: true, xUrl: true } },
    },
    take: 20,
  })

  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      const urls = [
        job.venue?.websiteUrl,
        job.venue?.instagramUrl,
        job.venue?.xUrl,
        job.sourceUrl,
      ].filter(Boolean)

      // nextFetchAt を来週に更新
      const nextFetchAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      try {
        // HP から簡易テキスト取得（実際のクローラはここを拡張）
        let fetchedContent = ''
        if (job.venue?.websiteUrl) {
          const res = await fetch(job.venue.websiteUrl, {
            headers: { 'User-Agent': 'NearJamBot/1.0' },
            signal: AbortSignal.timeout(10_000),
          })
          if (res.ok) {
            const html = await res.text()
            // 基本テキスト抽出（タグ除去）
            fetchedContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 2000)
          }
        }

        await prisma.autoCollectionJob.update({
          where: { id: job.id },
          data: {
            lastFetchedAt: now,
            lastStatus: fetchedContent ? 'pending_review' : 'error',
            nextFetchAt,
            errorMessage: fetchedContent ? null : 'No content fetched',
          },
        })

        return { jobId: job.id, status: 'queued', urls }
      } catch (e) {
        await prisma.autoCollectionJob.update({
          where: { id: job.id },
          data: {
            lastFetchedAt: now,
            lastStatus: 'error',
            nextFetchAt,
            errorMessage: e instanceof Error ? e.message : 'Unknown error',
          },
        })
        return { jobId: job.id, status: 'error' }
      }
    })
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({ processed: jobs.length, succeeded, failed })
}
