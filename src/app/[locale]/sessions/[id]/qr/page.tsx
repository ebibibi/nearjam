import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Image from 'next/image'

interface Props {
  params: Promise<{ id: string; locale: string }>
}

export default async function SessionQRPage({ params }: Props) {
  const { id: sessionId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  const jamSession = await prisma.jamSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      title: true,
      startsAt: true,
      sessionAdminId: true,
    },
  })

  if (!jamSession) redirect('/sessions')
  if (jamSession.sessionAdminId !== session.user.id) {
    return (
      <div className="container mx-auto max-w-md p-4 text-center text-gray-500">
        セッション管理者のみ QR コードを表示できます
      </div>
    )
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ca-nearjam.redflower-e9742c17.eastasia.azurecontainerapps.io'
  const checkinUrl = `${baseUrl}/sessions/${sessionId}/checkin`

  return (
    <div className="container mx-auto max-w-md p-4 text-center">
      <h1 className="mb-2 text-2xl font-bold">チェックイン QR</h1>
      <p className="mb-6 text-gray-500">
        {jamSession.title} —{' '}
        {new Date(jamSession.startsAt).toLocaleDateString('ja-JP')}
      </p>

      <div className="flex justify-center">
        {/* SVG QR コードを img タグで表示 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/v1/sessions/${sessionId}/qr`}
          alt="チェックイン QR コード"
          width={300}
          height={300}
          className="rounded-lg border p-4"
        />
      </div>

      <p className="mt-6 text-sm text-gray-400">
        参加者にスキャンしてもらうとチェックインできます
      </p>
      <p className="mt-2 break-all text-xs text-gray-300">{checkinUrl}</p>
    </div>
  )
}
