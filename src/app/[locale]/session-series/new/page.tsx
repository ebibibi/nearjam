import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CreateSeriesForm } from '@/components/session/CreateSeriesForm'

export default async function NewSessionSeriesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const venues = await prisma.venue.findMany({
    where: { ownerId: session.user.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <h1 className="mb-6 text-2xl font-bold">定期セッションシリーズを作成</h1>
      <CreateSeriesForm venues={venues} />
    </div>
  )
}
