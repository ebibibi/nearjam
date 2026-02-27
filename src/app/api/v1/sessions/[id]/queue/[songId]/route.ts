import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string; songId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { id, songId } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const session = await prisma.jamSession.findUnique({ where: { id } });
  if (!session) return err('Session not found', 404);
  if (session.sessionAdminId !== userId) return err('Forbidden', 403);

  const body = await req.json().catch(() => ({}));
  const { orderIndex, keyOverride } = body as { orderIndex?: number; keyOverride?: string };

  const updated = await prisma.jamSessionSong.update({
    where: { id: songId },
    data: {
      ...(orderIndex !== undefined ? { orderIndex } : {}),
      ...(keyOverride !== undefined ? { keyOverride } : {}),
    },
    include: { song: { select: { id: true, title: true, artist: true } } },
  });

  return ok(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, songId } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const session = await prisma.jamSession.findUnique({ where: { id } });
  if (!session) return err('Session not found', 404);
  if (session.sessionAdminId !== userId) return err('Forbidden', 403);

  await prisma.jamSessionSong.delete({ where: { id: songId } });

  return ok({ ok: true });
}
