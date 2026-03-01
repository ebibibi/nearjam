import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

/**
 * GET /api/stripe/connect/return
 * Stripe Connect オンボーディング完了後のリダイレクト先
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect('/auth/signin')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeAccountId: true },
  })

  if (user?.stripeAccountId && stripe) {
    const account = await stripe.accounts.retrieve(user.stripeAccountId)
    const isReady = account.details_submitted && account.charges_enabled

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nearjam.ebisuda.net'
    const locale = 'ja'

    if (isReady) {
      return NextResponse.redirect(`${baseUrl}/${locale}/profile?stripe=connected`)
    }
    return NextResponse.redirect(`${baseUrl}/${locale}/profile?stripe=pending`)
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://nearjam.ebisuda.net'
  return NextResponse.redirect(`${baseUrl}/ja/profile`)
}
