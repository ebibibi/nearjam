import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

/**
 * GET /api/stripe/connect
 * Stripe Connect Express オンボーディングリンクを発行する
 * ホスト（セッション主催者）が有料セッションを作る前に一度だけ通る
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeAccountId: true, email: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nearjam.ebisuda.net'

  // 既存の Connected Account があれば Dashboard リンクへリダイレクト
  if (user.stripeAccountId) {
    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId)
    return NextResponse.redirect(loginLink.url)
  }

  // 新規 Connect Express アカウントを作成
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'JP',
    email: user.email ?? undefined,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      product_description: 'ジャムセッション参加費の受け取り（NearJam 経由）',
    },
  })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { stripeAccountId: account.id },
  })

  // オンボーディング URL を発行
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${baseUrl}/api/stripe/connect/refresh`,
    return_url: `${baseUrl}/api/stripe/connect/return`,
    type: 'account_onboarding',
  })

  return NextResponse.redirect(accountLink.url)
}
