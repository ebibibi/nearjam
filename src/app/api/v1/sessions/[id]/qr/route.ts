import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import QRCode from 'qrcode'

/**
 * GET /api/v1/sessions/[id]/qr
 * セッションのチェックイン QR コードを SVG で返す
 * セッション管理者のみアクセス可
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: sessionId } = await params

  const jamSession = await prisma.jamSession.findUnique({
    where: { id: sessionId },
    select: { sessionAdminId: true, title: true, startsAt: true },
  })

  if (!jamSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (jamSession.sessionAdminId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://ca-nearjam.redflower-e9742c17.eastasia.azurecontainerapps.io'
  const checkinUrl = `${baseUrl}/sessions/${sessionId}/checkin`

  const svg = await QRCode.toString(checkinUrl, { type: 'svg', width: 300 })

  return new NextResponse(svg, {
    headers: { 'Content-Type': 'image/svg+xml' },
  })
}
