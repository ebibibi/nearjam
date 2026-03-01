import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET /api/v1/venues/[id]/rules
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const venue = await prisma.venue.findUnique({
    where: { id },
    select: { id: true, name: true, rulesMarkdown: true, verifiedAt: true },
  })

  if (!venue) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
  }

  return NextResponse.json(venue)
}

const updateSchema = z.object({
  rulesMarkdown: z.string().max(10000),
})

// PUT /api/v1/venues/[id]/rules — オーナーのみ更新可
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const venue = await prisma.venue.findUnique({
    where: { id },
    select: { ownerId: true, verifiedAt: true },
  })

  if (!venue) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
  }

  if (venue.ownerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden: only verified owner can edit rules' }, { status: 403 })
  }

  if (!venue.verifiedAt) {
    return NextResponse.json({ error: 'Venue must be verified before setting rules' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.venue.update({
    where: { id },
    data: { rulesMarkdown: parsed.data.rulesMarkdown },
    select: { id: true, rulesMarkdown: true, updatedAt: true },
  })

  return NextResponse.json(updated)
}
