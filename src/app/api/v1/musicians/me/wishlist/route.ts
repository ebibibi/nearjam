import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

export async function GET() {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const profile = await prisma.musicianProfile.findUnique({ where: { userId } });
  if (!profile) return ok([]);

  const wishlist = await prisma.songWish.findMany({
    where: { musicianProfileId: profile.id },
    include: { song: { select: { id: true, title: true, artist: true, genre: true, typicalKey: true, typicalBpmMin: true, typicalBpmMax: true } } },
    orderBy: { addedAt: 'desc' },
  });

  return ok(wishlist);
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const body = await req.json().catch(() => null);
  const songId = body?.songId;
  if (typeof songId !== 'string') return err('songId required', 400);

  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song) return err('Song not found', 404);

  const profile = await prisma.musicianProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const existing = await prisma.songWish.findFirst({
    where: { musicianProfileId: profile.id, songId },
  });

  if (existing) return ok(existing);

  const wish = await prisma.songWish.create({
    data: { musicianProfileId: profile.id, songId },
  });

  return ok(wish, 201);
}
