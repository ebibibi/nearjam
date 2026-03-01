import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/v1/sessions/[id]/checkin
 * QR スキャン後のチェックイン処理
 * ログインユーザーの Registration を CONFIRMED に更新、なければ作成
 */
export async function POST(
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
    select: { id: true, title: true, startsAt: true },
  })

  if (!jamSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const profile = await prisma.musicianProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!profile) {
    return NextResponse.json({ error: 'Musician profile required' }, { status: 400 })
  }

  const registration = await prisma.jamSessionRegistration.upsert({
    where: {
      jamSessionId_musicianProfileId: {
        jamSessionId: sessionId,
        musicianProfileId: profile.id,
      },
    },
    update: { status: 'CONFIRMED' },
    create: {
      jamSessionId: sessionId,
      musicianProfileId: profile.id,
      status: 'CONFIRMED',
    },
  })

  return NextResponse.json({
    message: 'Check-in successful!',
    session: { id: jamSession.id, title: jamSession.title },
    registration,
  })
}
