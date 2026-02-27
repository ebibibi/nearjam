import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';
import { CoverageAreaSchema } from '@/schemas/profile';

export async function GET() {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const profile = await prisma.musicianProfile.findUnique({ where: { userId } });
  if (!profile) return ok([]);

  const areas = await prisma.musicianCoverageArea.findMany({
    where: { musicianProfileId: profile.id },
    orderBy: [{ isHome: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      areaLabel: true,
      isHome: true,
      isSyncroom: true,
      syncroomNotes: true,
      isPublic: true,
      createdAt: true,
    },
  });

  return ok(areas);
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const body = await req.json().catch(() => null);
  const parsed = CoverageAreaSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }

  const profile = await prisma.musicianProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const area = await prisma.musicianCoverageArea.create({
    data: { ...parsed.data, musicianProfileId: profile.id },
    select: {
      id: true,
      areaLabel: true,
      isHome: true,
      isSyncroom: true,
      syncroomNotes: true,
      isPublic: true,
      createdAt: true,
    },
  });

  return ok(area, 201);
}
