import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const session = await prisma.jamSession.findUnique({ where: { id } });
  if (!session) return err('Session not found', 404);
  if (session.sessionAdminId !== userId) return err('Forbidden', 403);

  // Mark all CONFIRMED registrations as ATTENDED
  await prisma.jamSessionRegistration.updateMany({
    where: { jamSessionId: id, status: 'CONFIRMED' },
    data: { status: 'ATTENDED' },
  });

  return ok({ ok: true });
}
