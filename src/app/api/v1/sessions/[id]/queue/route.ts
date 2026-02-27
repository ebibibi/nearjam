import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';
import { AddSongToQueueSchema } from '@/schemas/session';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const songs = await prisma.jamSessionSong.findMany({
    where: { jamSessionId: id },
    orderBy: { orderIndex: 'asc' },
    include: {
      song: { select: { id: true, title: true, artist: true, genre: true, typicalKey: true } },
    },
  });

  return ok(songs);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const session = await prisma.jamSession.findUnique({ where: { id } });
  if (!session) return err('Session not found', 404);
  if (session.sessionAdminId !== userId) return err('Forbidden — admin only', 403);

  const body = await req.json().catch(() => null);
  const parsed = AddSongToQueueSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }

  const maxOrder = await prisma.jamSessionSong.aggregate({
    where: { jamSessionId: id },
    _max: { orderIndex: true },
  });

  const item = await prisma.jamSessionSong.create({
    data: {
      jamSessionId: id,
      songId: parsed.data.songId,
      keyOverride: parsed.data.keyOverride,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
    include: { song: { select: { id: true, title: true, artist: true } } },
  });

  return ok(item, 201);
}
