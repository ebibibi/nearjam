import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { MannerPageEditor } from '@/components/venue/MannerPageEditor'

interface Props {
  params: Promise<{ id: string; locale: string }>
}

export default async function VenueRulesEditPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const venue = await prisma.venue.findUnique({
    where: { id },
    select: { id: true, name: true, ownerId: true, verifiedAt: true, rulesMarkdown: true },
  })

  if (!venue) redirect('/venues')

  if (venue.ownerId !== session.user.id) {
    return (
      <div className="container mx-auto max-w-2xl p-4">
        <p className="text-red-600">この会場のオーナーのみ編集できます</p>
      </div>
    )
  }

  if (!venue.verifiedAt) {
    return (
      <div className="container mx-auto max-w-2xl p-4">
        <p className="text-yellow-600">
          マナーページの編集は会場認証後に利用できます
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <h1 className="mb-2 text-2xl font-bold">{venue.name}</h1>
      <p className="mb-6 text-gray-500">マナーページ・セッションルール編集</p>
      <MannerPageEditor venueId={id} initialContent={venue.rulesMarkdown ?? ''} />
    </div>
  )
}
