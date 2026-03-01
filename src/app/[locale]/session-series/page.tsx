import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { SeriesGenerateButton } from '@/components/session/SeriesGenerateButton'

export default async function SessionSeriesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const series = await prisma.sessionSeries.findMany({
    where: { hostId: session.user.id, isActive: true },
    include: {
      venue: { select: { id: true, name: true } },
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">定期セッション管理</h1>
        <Link
          href="/session-series/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          + 新規シリーズ作成
        </Link>
      </div>

      {series.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-gray-500">
          <p className="text-lg">定期セッションシリーズがありません</p>
          <p className="mt-2 text-sm">毎週・毎月開催のセッションをシリーズとして管理できます</p>
          <Link
            href="/session-series/new"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            シリーズを作成する
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {series.map((s) => (
            <div key={s.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{s.title}</h2>
                  {s.venue && (
                    <p className="text-sm text-gray-500">
                      <Link href={`/venues/${s.venue.id}`} className="hover:underline">
                        {s.venue.name}
                      </Link>
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-600">
                    {s.rrule} · 開始 {s.startTime} · {s.durationMinutes}分
                  </p>
                  <p className="text-sm text-gray-500">
                    生成済みセッション: {s._count.sessions}件
                  </p>
                </div>
                <SeriesGenerateButton seriesId={s.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
