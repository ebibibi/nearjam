import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/stripe/connect/refresh
 * オンボーディングリンクの有効期限切れ時にリフレッシュする
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect('/auth/signin')
  }

  if (!stripe) {
    return NextResponse.redirect('/ja/profile')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeAccountId: true },
  })

  if (!user?.stripeAccountId) {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nearjam.ebisuda.net'
    return NextResponse.redirect(`${baseUrl}/api/stripe/connect`)
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nearjam.ebisuda.net'
  const accountLink = await stripe.accountLinks.create({
    account: user.stripeAccountId,
    refresh_url: `${baseUrl}/api/stripe/connect/refresh`,
    return_url: `${baseUrl}/api/stripe/connect/return`,
    type: 'account_onboarding',
  })

  return NextResponse.redirect(accountLink.url)
}
