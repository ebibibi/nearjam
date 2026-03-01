import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string; regId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, regId } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const session = await prisma.jamSession.findUnique({ where: { id } });
  if (!session) return err('Session not found', 404);
  if (session.sessionAdminId !== userId) return err('Forbidden', 403);

  const registration = await prisma.jamSessionRegistration.findUnique({ where: { id: regId } });
  if (!registration || registration.jamSessionId !== id) return err('Registration not found', 404);

  await prisma.jamSessionRegistration.delete({ where: { id: regId } });

  return ok({ ok: true });
}
