import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe, calcRefundAmount, CancellationPolicy } from '@/lib/stripe'

/**
 * POST /api/v1/sessions/[id]/registrations/[regId]/cancel
 * 参加キャンセル + キャンセルポリシーに基づく返金
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; regId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: sessionId, regId } = await params

  const registration = await prisma.jamSessionRegistration.findUnique({
    where: { id: regId },
    include: {
      musicianProfile: { select: { userId: true } },
      jamSession: {
        select: {
          id: true,
          title: true,
          startsAt: true,
          ticketPriceYen: true,
          cancellationPolicy: true,
          sessionAdmin: { select: { stripeAccountId: true } },
        },
      },
    },
  })

  if (!registration) {
    return NextResponse.json({ error: 'Registration not found' }, { status: 404 })
  }

  // 本人 or セッション管理者のみキャンセル可
  const jamSession = await prisma.jamSession.findUnique({
    where: { id: sessionId },
    select: { sessionAdminId: true },
  })

  const isSelf = registration.musicianProfile.userId === session.user.id
  const isAdmin = jamSession?.sessionAdminId === session.user.id

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Stripe 返金処理
  let refundedAmountYen = 0

  if (
    stripe &&
    registration.paymentIntentId &&
    registration.paymentStatus === 'paid' &&
    registration.paidAmountYen
  ) {
    const refundAmount = calcRefundAmount(
      registration.paidAmountYen,
      registration.jamSession.startsAt,
      new Date(),
      registration.jamSession.cancellationPolicy as CancellationPolicy | null
    )

    refundedAmountYen = refundAmount

    if (refundAmount > 0) {
      await stripe.refunds.create({
        payment_intent: registration.paymentIntentId,
        amount: refundAmount,
      })
    }
  }

  await prisma.jamSessionRegistration.update({
    where: { id: regId },
    data: {
      status: 'INTERESTED', // キャンセル後は INTERESTED に戻す（または削除）
      paymentStatus: refundedAmountYen === registration.paidAmountYen
        ? 'refunded'
        : refundedAmountYen > 0
        ? 'partially_refunded'
        : registration.paymentStatus ?? undefined,
      refundedAmountYen: refundedAmountYen,
    },
  })

  const cancelFeeYen = (registration.paidAmountYen ?? 0) - refundedAmountYen

  return NextResponse.json({
    message: 'Cancelled successfully',
    paidAmountYen: registration.paidAmountYen ?? 0,
    refundedAmountYen,
    cancelFeeYen,
  })
}
