import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';
import { geocodeAddress } from '@/lib/geocoding';
import { CreateStudioSchema } from '@/schemas/studio';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const studio = await prisma.studio.findUnique({
    where: { id },
    include: { rooms: { orderBy: { name: 'asc' } } },
  });

  if (!studio) return err('Not found', 404);
  return ok(studio);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const studio = await prisma.studio.findUnique({ where: { id } });
  if (!studio) return err('Not found', 404);
  if (studio.ownerId && studio.ownerId !== userId) return err('Forbidden', 403);

  const body = await req.json().catch(() => null);
  const parsed = CreateStudioSchema.partial().safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }

  const { address, ...rest } = parsed.data;

  let lat = studio.lat ?? undefined;
  let lng = studio.lng ?? undefined;
  if (address && address !== studio.address) {
    const coords = await geocodeAddress(address).catch(() => null);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  const updated = await prisma.studio.update({
    where: { id },
    data: {
      ...rest,
      ...(address !== undefined ? { address, lat, lng } : {}),
    },
  });

  return ok(updated);
}
