import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe, calcPlatformFee, describeCancellationPolicy } from '@/lib/stripe'

/**
 * POST /api/v1/sessions/[id]/checkout
 * Stripe Checkout セッションを作成してリダイレクト URL を返す
 *
 * フロー:
 * 1. 参加者が「Stripe で支払う」ボタンを押す
 * 2. このエンドポイントが Checkout Session を作成
 * 3. フロントが stripe.redirectToCheckout() でリダイレクト
 * 4. 支払い完了 → Stripe Webhook が registration を 'paid' に更新
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured on this server' }, { status: 503 })
  }

  const { id: sessionId } = await params

  const jamSession = await prisma.jamSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      title: true,
      startsAt: true,
      ticketPriceYen: true,
      cancellationPolicy: true,
      sessionAdmin: {
        select: { id: true, stripeAccountId: true, nickname: true },
      },
    },
  })

  if (!jamSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (!jamSession.ticketPriceYen || jamSession.ticketPriceYen <= 0) {
    return NextResponse.json({ error: 'This session is free — no payment required' }, { status: 400 })
  }

  if (!jamSession.sessionAdmin.stripeAccountId) {
    return NextResponse.json({
      error: 'Host has not connected Stripe yet. Please contact the session host.',
    }, { status: 402 })
  }

  // 参加者の既存 registration を取得 or 作成
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
    update: {},
    create: {
      jamSessionId: sessionId,
      musicianProfileId: profile.id,
      status: 'INTERESTED',
      paymentStatus: 'pending',
    },
  })

  const reqBody = await req.json().catch(() => ({}))
  const locale: string = reqBody.locale === 'en' ? 'en' : 'ja'

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nearjam.ebisuda.net'
  const policyText = describeCancellationPolicy(
    jamSession.cancellationPolicy as Parameters<typeof describeCancellationPolicy>[0]
  )

  const dateStr = new Date(jamSession.startsAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'ja-JP')
  const productName = locale === 'en'
    ? `${jamSession.title} — Ticket`
    : `${jamSession.title} 参加費`
  const productDesc = locale === 'en'
    ? `Event on ${dateStr} | Cancellation policy: ${policyText}`
    : `${dateStr} 開催 | キャンセルポリシー: ${policyText}`

  const checkoutSession = await stripe.checkout.sessions.create(
    {
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: productName,
              description: productDesc,
            },
            unit_amount: jamSession.ticketPriceYen,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: calcPlatformFee(jamSession.ticketPriceYen),
        transfer_data: {
          destination: jamSession.sessionAdmin.stripeAccountId,
        },
        metadata: {
          registrationId: registration.id,
          jamSessionId: sessionId,
          userId: session.user.id,
        },
      },
      success_url: `${baseUrl}/ja/sessions/${sessionId}?payment=success`,
      cancel_url: `${baseUrl}/ja/sessions/${sessionId}?payment=cancelled`,
    },
    { stripeAccount: jamSession.sessionAdmin.stripeAccountId }
  )

  return NextResponse.json({ url: checkoutSession.url })
}
