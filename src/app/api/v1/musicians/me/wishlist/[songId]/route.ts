import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';
import { z } from 'zod';

type Params = { params: Promise<{ songId: string }> };

const PatchWishSchema = z.object({
  preferredKey: z.string().max(10).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { songId } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const body = await req.json().catch(() => null);
  const parsed = PatchWishSchema.safeParse(body);
  if (!parsed.success) return err('Invalid body', 400);

  const profile = await prisma.musicianProfile.findUnique({ where: { userId } });
  if (!profile) return err('Profile not found', 404);

  const wish = await prisma.songWish.findFirst({
    where: { musicianProfileId: profile.id, songId },
  });
  if (!wish) return err('Not in wishlist', 404);

  const updated = await prisma.songWish.update({
    where: { id: wish.id },
    data: { preferredKey: parsed.data.preferredKey ?? null },
  });

  return ok(updated);
}

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
