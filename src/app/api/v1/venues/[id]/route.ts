import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';
import { geocodeAddress } from '@/lib/geocoding';
import { UpdateVenueSchema } from '@/schemas/venue';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const venue = await prisma.venue.findUnique({
    where: { id },
    include: {
      tendencies: {
        where: { isActive: true },
        include: { sourceUser: { select: { nickname: true } } },
      },
    },
  });

  if (!venue) return err('Not found', 404);
  return ok(venue);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue) return err('Not found', 404);
  if (venue.ownerId && venue.ownerId !== userId) return err('Forbidden', 403);

  const body = await req.json().catch(() => null);
  const parsed = UpdateVenueSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }

  const { address, ...rest } = parsed.data;

  let lat = venue.lat ?? undefined;
  let lng = venue.lng ?? undefined;
  if (address && address !== venue.address) {
    const coords = await geocodeAddress(address).catch(() => null);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  const updated = await prisma.venue.update({
    where: { id },
    data: {
      ...rest,
      ...(address !== undefined ? { address, lat, lng } : {}),
    },
  });

  return ok(updated);
}
