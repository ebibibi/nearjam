import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string; tendencyId: string }> };

/** 会場オーナーが tendency を confirmed（OWNER_VERIFIED）または outdated（isActive: false）にする */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, tendencyId } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const venue = await prisma.venue.findUnique({ where: { id }, select: { ownerId: true } });
  if (!venue) return err('Venue not found', 404);
  if (venue.ownerId !== userId) return err('Only the venue owner can perform this action', 403);

  const tendency = await prisma.sessionTendency.findFirst({
    where: { id: tendencyId, venueId: id },
  });
  if (!tendency) return err('Tendency not found', 404);

  const body = await req.json().catch(() => null);
  const action = (body as { action?: string })?.action;

  if (action === 'confirm') {
    const updated = await prisma.sessionTendency.update({
      where: { id: tendencyId },
      data: { sourceType: 'OWNER_VERIFIED', isActive: true },
    });
    return ok(updated);
  }

  if (action === 'outdated') {
    const updated = await prisma.sessionTendency.update({
      where: { id: tendencyId },
      data: { isActive: false },
    });
    return ok(updated);
  }

  return err('action must be "confirm" or "outdated"', 400);
}
