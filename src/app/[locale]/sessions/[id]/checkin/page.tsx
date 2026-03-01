import { getTranslations, setRequestLocale } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CheckinButton } from '@/components/session/CheckinButton'
import { prisma } from '@/lib/prisma'

interface Props {
  params: Promise<{ id: string; locale: string }>
}

export default async function CheckinPage({ params }: Props) {
  const { id: sessionId, locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'session' })
  const session = await auth()
  if (!session?.user?.id) redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/sessions/${sessionId}/checkin`)

  const jamSession = await prisma.jamSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      title: true,
      startsAt: true,
      venue: { select: { id: true, name: true } },
    },
  })

  if (!jamSession) {
    return (
      <div className="container mx-auto max-w-md p-8 text-center text-gray-500">
        {t('checkin.notFound')}
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-md p-4 text-center">
      <div className="mt-8 rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-2 text-4xl">🎵</div>
        <h1 className="mb-1 text-2xl font-bold">{jamSession.title}</h1>
        {jamSession.venue && (
          <p className="text-gray-500">{jamSession.venue.name}</p>
        )}
        <p className="text-gray-400">
          {new Date(jamSession.startsAt).toLocaleString(locale)}
        </p>

        <div className="mt-8">
          <CheckinButton sessionId={sessionId} />
        </div>
      </div>
    </div>
  )
}
