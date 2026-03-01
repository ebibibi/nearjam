import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'

interface Props {
  sessionId: string
}

/**
 * セッション内の各参加者の演奏回数を可視化するサーバーコンポーネント
 * LiveSession ダッシュボードから呼び出す
 */
export async function TurnTracker({ sessionId }: Props) {
  const t = await getTranslations('session.turnTracker')
  const logs = await prisma.performanceLog.groupBy({
    by: ['musicianProfileId'],
    where: { jamSessionId: sessionId },
    _count: { id: true },
    _max: { orderInSession: true },
    orderBy: { _count: { id: 'desc' } },
  })

  if (logs.length === 0) {
    return (
      <div className="text-center text-sm text-gray-400 py-2">
        {t('noLogs')}
      </div>
    )
  }

  const profileIds = logs.map((l) => l.musicianProfileId)
  const profiles = await prisma.musicianProfile.findMany({
    where: { id: { in: profileIds } },
    select: {
      id: true,
      user: { select: { nickname: true, image: true } },
      instruments: { select: { instrument: true }, take: 1 },
    },
  })
  const profileMap = new Map(profiles.map((p) => [p.id, p]))

  const maxCount = Math.max(...logs.map((l) => l._count.id))

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-600">{t('title')}</h3>
      {logs.map((log) => {
        const profile = profileMap.get(log.musicianProfileId)
        const count = log._count.id
        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0

        return (
          <div key={log.musicianProfileId} className="flex items-center gap-2">
            {profile?.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.user.image}
                alt=""
                className="h-7 w-7 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-gray-200 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate font-medium">
                  {profile?.user.nickname ?? t('nameNotSet')}
                </span>
                <span className="ml-2 flex-shrink-0 text-gray-500">{t('timesCount', { count })}</span>
              </div>
              <div className="mt-0.5 h-1.5 w-full rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
