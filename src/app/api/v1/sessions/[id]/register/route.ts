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

  if (session.maxParticipants) {
    const count = await prisma.jamSessionRegistration.count({ where: { jamSessionId: id } });
    if (count >= session.maxParticipants) {
      return err('Session is full', 409);
    }
  }

  const profile = await prisma.musicianProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const registration = await prisma.jamSessionRegistration.upsert({
    where: { jamSessionId_musicianProfileId: { jamSessionId: id, musicianProfileId: profile.id } },
    create: { jamSessionId: id, musicianProfileId: profile.id, status: 'CONFIRMED' },
    update: { status: 'CONFIRMED' },
  });

  return ok(registration, 201);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const profile = await prisma.musicianProfile.findUnique({ where: { userId } });
  if (!profile) return err('Profile not found', 404);

  await prisma.jamSessionRegistration.deleteMany({
    where: { jamSessionId: id, musicianProfileId: profile.id },
  });

  return ok({ ok: true });
}
