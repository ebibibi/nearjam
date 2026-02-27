import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, err } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const swLat = parseFloat(sp.get('swLat') ?? '');
  const swLng = parseFloat(sp.get('swLng') ?? '');
  const neLat = parseFloat(sp.get('neLat') ?? '');
  const neLng = parseFloat(sp.get('neLng') ?? '');

  if ([swLat, swLng, neLat, neLng].some(isNaN)) {
    return err('swLat, swLng, neLat, neLng are required', 400);
  }

  const [venues, studios] = await Promise.all([
    prisma.venue.findMany({
      where: {
        lat: { gte: swLat, lte: neLat },
        lng: { gte: swLng, lte: neLng },
      },
      select: {
        id: true,
        name: true,
        lat: true,
        lng: true,
        nearestStation: true,
        verifiedAt: true,
      },
    }),
    prisma.studio.findMany({
      where: {
        lat: { gte: swLat, lte: neLat },
        lng: { gte: swLng, lte: neLng },
      },
      select: {
        id: true,
        name: true,
        lat: true,
        lng: true,
        nearestStation: true,
        verifiedAt: true,
      },
    }),
  ]);

  return ok({ venues, studios });
}
