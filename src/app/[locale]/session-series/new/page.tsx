import { getTranslations, setRequestLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CreateSeriesForm } from '@/components/session/CreateSeriesForm'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'session' })
  return { title: t('series.createTitle') }
}

export default async function NewSessionSeriesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`)

  const t = await getTranslations({ locale, namespace: 'session' })

  const venues = await prisma.venue.findMany({
    where: { ownerId: session.user.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">{t('series.createTitle')}</h1>
      <CreateSeriesForm venues={venues} />
    </div>
  )
}
