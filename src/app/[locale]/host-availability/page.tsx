import { getTranslations, setRequestLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { HostAvailabilityForm } from '@/components/host/HostAvailabilityForm'
import { DeleteAvailabilityButton } from '@/components/host/DeleteAvailabilityButton'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'meta' })
  return { title: t('hostAvailTitle'), description: t('hostAvailDesc') }
}

export default async function HostAvailabilityPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`)

  const t = await getTranslations({ locale, namespace: 'hostAvailability' })

  const availabilities = await prisma.hostAvailability.findMany({
    where: { hostId: session.user.id, isActive: true },
    orderBy: { availableDate: 'asc' },
  })

  const venues = await prisma.venue.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <h1 className="mb-1 text-2xl font-bold">{t('title')}</h1>
      <p className="mb-6 text-sm text-gray-500">{t('subtitle')}</p>

      <HostAvailabilityForm locale={locale} venues={venues} />

      <div className="mt-8">
        {availabilities.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">
            <p>{t('empty')}</p>
            <p className="mt-1 text-sm">{t('emptyHint')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availabilities.map((slot) => (
              <div key={slot.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      {t('slotInfo', {
                        date: slot.availableDate.toLocaleDateString(
                          locale === 'ja' ? 'ja-JP' : 'en-US',
                          { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }
                        ),
                        time: slot.startTime,
                        duration: slot.durationMinutes,
                      })}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {t('instrumentsList', { list: slot.instruments.join(', ') })}
                    </p>
                    <p className="text-sm text-violet-600">
                      {t('songCount', { n: slot.songIds.length })}
                    </p>
                    {slot.notes && (
                      <p className="mt-1 text-sm text-gray-600">{slot.notes}</p>
                    )}
                  </div>
                  <DeleteAvailabilityButton id={slot.id} label={t('delete')} confirmMessage={t('deleteConfirm')} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
