import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';
import { CreateStudioRoomSchema } from '@/schemas/studio';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const rooms = await prisma.studioRoom.findMany({
    where: { studioId: id },
    orderBy: { name: 'asc' },
  });

  return ok(rooms);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const studio = await prisma.studio.findUnique({ where: { id } });
  if (!studio) return err('Studio not found', 404);
  if (studio.ownerId && studio.ownerId !== userId) return err('Forbidden', 403);

  const body = await req.json().catch(() => null);
  const parsed = CreateStudioRoomSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }

  const room = await prisma.studioRoom.create({
    data: { ...parsed.data, studioId: id },
  });

  return ok(room, 201);
}
