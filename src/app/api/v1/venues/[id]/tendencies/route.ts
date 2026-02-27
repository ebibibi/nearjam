import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, getAuthUserId, ok, err } from '@/lib/api-utils';
import { CreateTendencySchema } from '@/schemas/tendency';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const tendencies = await prisma.sessionTendency.findMany({
    where: { venueId: id, isActive: true },
    orderBy: [{ sourceType: 'asc' }, { createdAt: 'desc' }],
    include: { sourceUser: { select: { nickname: true } } },
  });

  return ok(tendencies);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue) return err('Venue not found', 404);

  const body = await req.json().catch(() => null);
  const parsed = CreateTendencySchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }

  // Owner gets OWNER_VERIFIED; others get CROWDSOURCED
  const sourceType = venue.ownerId === userId ? 'OWNER_VERIFIED' : 'CROWDSOURCED';

  const tendency = await prisma.sessionTendency.create({
    data: {
      ...parsed.data,
      venueId: id,
      sourceUserId: userId,
      sourceType,
    },
    include: { sourceUser: { select: { nickname: true } } },
  });

  return ok(tendency, 201);
}
