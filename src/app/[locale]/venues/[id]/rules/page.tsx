import { getTranslations, setRequestLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { MannerPageEditor } from '@/components/venue/MannerPageEditor'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string; locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'venue' })
  return { title: `${t('rules.title')} — NearJam` }
}

export default async function VenueRulesEditPage({ params }: Props) {
  const { id, locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'venue' })
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`)

  const venue = await prisma.venue.findUnique({
    where: { id },
    select: { id: true, name: true, ownerId: true, verifiedAt: true, rulesMarkdown: true },
  })

  if (!venue) redirect(`/${locale}/venues`)

  if (venue.ownerId !== session.user.id) {
    return (
      <div className="container mx-auto max-w-2xl p-4">
        <p className="text-red-600">{t('rules.ownerOnly')}</p>
      </div>
    )
  }

  if (!venue.verifiedAt) {
    return (
      <div className="container mx-auto max-w-2xl p-4">
        <p className="text-yellow-600">{t('rules.verifiedOnly')}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <h1 className="mb-2 text-2xl font-bold">{venue.name}</h1>
      <p className="mb-6 text-gray-500">{t('rules.subtitle')}</p>
      <MannerPageEditor venueId={id} initialContent={venue.rulesMarkdown ?? ''} />
    </div>
  )
}
