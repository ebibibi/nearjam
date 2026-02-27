import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const session = await prisma.jamSession.findUnique({ where: { id } });
  if (!session) return err('Session not found', 404);

  const body = await req.json().catch(() => null);
  const { songId, instrument, keyPlayed, wasSuccessful } = body ?? {};

  if (!songId || typeof songId !== 'string') {
    return err('songId required', 400);
  }

  const profile = await prisma.musicianProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const log = await prisma.performanceLog.create({
    data: {
      jamSessionId: id,
      songId,
      musicianProfileId: profile.id,
      registeredById: userId,
      instrumentPlayed: instrument ?? null,
      wasSoloist: wasSuccessful ?? true,
    },
  });

  return ok(log, 201);
}
