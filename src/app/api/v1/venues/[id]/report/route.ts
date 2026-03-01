import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const reportSchema = z.object({
  reason: z.string().min(10).max(2000),
  evidenceUrl: z.string().url().optional(),
})

// POST /api/v1/venues/[id]/report — なりすまし報告
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: venueId } = await params

  const venue = await prisma.venue.findUnique({ where: { id: venueId } })
  if (!venue) {
    return NextResponse.json({ error: 'Venue not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = reportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const report = await prisma.venueImpersonationReport.create({
    data: {
      venueId,
      reporterId: session.user.id,
      reason: parsed.data.reason,
      evidenceUrl: parsed.data.evidenceUrl,
    },
  })

  return NextResponse.json(report, { status: 201 })
}
