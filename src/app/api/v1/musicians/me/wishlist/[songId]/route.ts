import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ songId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { songId } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const profile = await prisma.musicianProfile.findUnique({ where: { userId } });
  if (!profile) return err('Profile not found', 404);

  await prisma.songWish.deleteMany({
    where: { musicianProfileId: profile.id, songId },
  });

  return ok({ ok: true });
}
