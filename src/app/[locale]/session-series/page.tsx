import { getTranslations, setRequestLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { SeriesGenerateButton } from '@/components/session/SeriesGenerateButton'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return { title: t('seriesTitle'), description: t('seriesDesc') }
}

export default async function SessionSeriesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`)

  const t = await getTranslations({ locale, namespace: 'session' })

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
        <h1 className="text-2xl font-bold">{t('series.title')}</h1>
        <Link
          href={`/${locale}/session-series/new`}
          className="rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-700"
        >
          {t('series.create')}
        </Link>
      </div>

      {series.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-gray-500">
          <p className="text-lg">{t('series.empty')}</p>
          <p className="mt-2 text-sm">{t('series.emptyHint')}</p>
          <Link
            href={`/${locale}/session-series/new`}
            className="mt-4 inline-block rounded-lg bg-violet-600 px-6 py-3 text-white hover:bg-violet-700"
          >
            {t('series.createCta')}
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
                      <Link href={`/${locale}/venues/${s.venue.id}`} className="hover:underline">
                        {s.venue.name}
                      </Link>
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-600">
                    {s.rrule} · {t('series.startTime', { time: s.startTime })} · {t('series.duration', { n: s.durationMinutes })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('series.generatedCount', { n: s._count.sessions })}
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
