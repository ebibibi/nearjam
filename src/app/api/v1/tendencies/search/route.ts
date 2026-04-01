import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/api-utils';

/**
 * GET /api/v1/tendencies/search?q=<query>
 *
 * Search session tendencies by artist name, song name, or genre.
 * This endpoint is PUBLIC (no auth required) — it searches typicalArtists,
 * typicalSongs, genres, and tendency name fields.
 * Returns matching tendencies with venue info and source URLs.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return ok([]);

  const tendencies = await prisma.sessionTendency.findMany({
    where: {
      isActive: true,
      OR: [
        { typicalArtists: { has: q } },
        { typicalSongs: { has: q } },
        { name: { contains: q, mode: 'insensitive' } },
        { genres: { has: q } },
        // Partial match for artists and songs
        { typicalArtists: { hasSome: [q] } },
      ],
    },
    select: {
      id: true,
      name: true,
      typicalDayOfWeek: true,
      typicalStartTime: true,
      typicalEndTime: true,
      genres: true,
      levelRange: true,
      entrySystem: true,
      typicalArtists: true,
      typicalSongs: true,
      sourceUrl: true,
      venue: {
        select: {
          id: true,
          name: true,
          nearestStation: true,
          walkMinutes: true,
          websiteUrl: true,
        },
      },
    },
    orderBy: { name: 'asc' },
    take: 30,
  });

  // If exact match didn't find enough, do a broader partial search
  if (tendencies.length < 5) {
    const broader = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM "SessionTendency"
       WHERE "isActive" = true
       AND (
         EXISTS (SELECT 1 FROM unnest("typicalArtists") AS a WHERE a ILIKE $1)
         OR EXISTS (SELECT 1 FROM unnest("typicalSongs") AS s WHERE s ILIKE $1)
         OR "name" ILIKE $1
         OR EXISTS (SELECT 1 FROM unnest("genres") AS g WHERE g ILIKE $1)
       )
       LIMIT 30`,
      `%${q}%`
    );

    const broaderIds = new Set(broader.map((r) => r.id));
    const existingIds = new Set(tendencies.map((t) => t.id));
    const missingIds = [...broaderIds].filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      const extra = await prisma.sessionTendency.findMany({
        where: { id: { in: missingIds } },
        select: {
          id: true,
          name: true,
          typicalDayOfWeek: true,
          typicalStartTime: true,
          typicalEndTime: true,
          genres: true,
          levelRange: true,
          entrySystem: true,
          typicalArtists: true,
          typicalSongs: true,
          sourceUrl: true,
          venue: {
            select: {
              id: true,
              name: true,
              nearestStation: true,
              walkMinutes: true,
              websiteUrl: true,
            },
          },
        },
      });
      tendencies.push(...extra);
    }
  }

  return ok(tendencies);
}
