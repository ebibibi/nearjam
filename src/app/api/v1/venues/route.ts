import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err, parsePagination } from '@/lib/api-utils';
import { geocodeAddress } from '@/lib/geocoding';
import { CreateVenueSchema } from '@/schemas/venue';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const { limit, skip } = parsePagination(sp);
  const q = sp.get('q');

  const venues = await prisma.venue.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { nearestStation: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    take: limit,
    skip,
    orderBy: { createdAt: 'desc' },
    include: {
      tendencies: {
        where: { isActive: true },
        take: 1,
        select: { name: true, typicalDayOfWeek: true, genres: true },
      },
    },
  });

  return ok(venues);
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const body = await req.json().catch(() => null);
  const parsed = CreateVenueSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }

  const { address, ...rest } = parsed.data;

  // Geocode if address is provided
  let lat: number | undefined;
  let lng: number | undefined;
  if (address) {
    const coords = await geocodeAddress(address).catch(() => null);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  const venue = await prisma.venue.create({
    data: {
      ...rest,
      address,
      lat,
      lng,
      ownerId: userId,
    },
  });

  return ok(venue, 201);
}
