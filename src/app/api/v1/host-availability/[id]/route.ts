import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ok, err } from '@/lib/api-utils'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params

  const authResult = await requireAuth()
  if ('status' in authResult) return authResult
  const { userId } = authResult

  const slot = await prisma.hostAvailability.findUnique({ where: { id } })
  if (!slot) return err('Not found', 404)
  if (slot.hostId !== userId) return err('Forbidden', 403)

  await prisma.hostAvailability.update({
    where: { id },
    data: { isActive: false },
  })

  return ok({ ok: true })
}
