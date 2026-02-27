import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, parsePagination } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  // JASRAC compliance: require auth to access song data
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;

  const sp = req.nextUrl.searchParams;
  const { limit, skip } = parsePagination(sp);
  const q = sp.get('q');
  const genre = sp.get('genre');

  const songs = await prisma.song.findMany({
    where: {
      approved: true,
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { artist: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(genre ? { genre: { equals: genre, mode: 'insensitive' } } : {}),
    },
    take: limit,
    skip,
    orderBy: [{ wishlistCount: 'desc' }, { title: 'asc' }],
    select: {
      id: true,
      title: true,
      artist: true,
      genre: true,
      typicalKey: true,
      typicalBpmMin: true,
      typicalBpmMax: true,
      difficulty: true,
      wishlistCount: true,
      tags: true,
    },
  });

  return ok(songs);
}
