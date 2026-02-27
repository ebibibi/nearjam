import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';
import { CreateSessionSchema } from '@/schemas/session';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const session = await prisma.jamSession.findUnique({
    where: { id },
    include: {
      venue: { select: { id: true, name: true, nearestStation: true, address: true } },
      studio: { select: { id: true, name: true } },
      studioRoom: { select: { id: true, name: true } },
      songs: {
        orderBy: { orderIndex: 'asc' },
        include: { song: { select: { id: true, title: true, artist: true, genre: true } } },
      },
      registrations: {
        include: {
          musicianProfile: {
            select: {
              id: true,
              user: { select: { nickname: true, image: true } },
              instruments: { select: { instrument: true } },
            },
          },
        },
      },
      _count: { select: { registrations: true } },
    },
  });

  if (!session) return err('Not found', 404);
  return ok(session);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const session = await prisma.jamSession.findUnique({ where: { id } });
  if (!session) return err('Not found', 404);
  if (session.sessionAdminId !== userId) return err('Forbidden', 403);

  const body = await req.json().catch(() => null);
  const parsed = CreateSessionSchema.partial().safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }

  const { startsAt, ...rest } = parsed.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    ...rest,
    ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
  };

  const updated = await prisma.jamSession.update({
    where: { id },
    data: updateData,
  });

  return ok(updated);
}
