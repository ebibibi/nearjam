import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

/**
 * POST /api/webhooks/stripe
 * Stripe からの Webhook イベントを処理する
 *
 * 処理するイベント:
 * - payment_intent.succeeded  → registration を 'paid' / CONFIRMED に更新
 * - charge.refunded           → 返金額を記録
 */
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const registrationId = pi.metadata?.registrationId
        if (!registrationId) break

        await prisma.jamSessionRegistration.update({
          where: { id: registrationId },
          data: {
            paymentIntentId: pi.id,
            paymentStatus: 'paid',
            paidAmountYen: Math.floor(pi.amount_received),
            status: 'CONFIRMED',
          },
        })
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const piId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id

        if (!piId) break

        const registration = await prisma.jamSessionRegistration.findFirst({
          where: { paymentIntentId: piId },
        })
        if (!registration) break

        const refundedAmount = charge.amount_refunded
        const isFullRefund = refundedAmount >= (registration.paidAmountYen ?? 0)

        await prisma.jamSessionRegistration.update({
          where: { id: registration.id },
          data: {
            refundedAmountYen: refundedAmount,
            paymentStatus: isFullRefund ? 'refunded' : 'partially_refunded',
          },
        })
        break
      }

      default:
        // 未処理のイベントは無視
        break
    }
  } catch (err) {
    console.error('[stripe webhook] error processing event:', event.type, err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
