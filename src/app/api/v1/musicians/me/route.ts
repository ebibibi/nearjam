import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';
import { UpdateProfileSchema } from '@/schemas/profile';

export async function GET() {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const profile = await prisma.musicianProfile.findUnique({
    where: { userId },
    include: {
      instruments: true,
      genres: true,
      coverageAreas: { orderBy: { isHome: 'desc' } },
    },
    // Exclude lat/lng from response
  });

  if (!profile) {
    // Return user info without profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true, email: true, image: true },
    });
    return ok({ user, profile: null });
  }

  const { areaLat: _aLat, areaLng: _aLng, ...safeProfile } = profile;

  return ok({ profile: safeProfile });
}

export async function PUT(req: NextRequest) {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const body = await req.json().catch(() => null);
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }

  const { nickname, instruments, genres, ...profileData } = parsed.data;

  // Upsert profile
  const profile = await prisma.musicianProfile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
  });

  // Update nickname on User
  if (nickname !== undefined) {
    await prisma.user.update({ where: { id: userId }, data: { nickname } });
  }

  // Replace instruments
  if (instruments !== undefined) {
    await prisma.musicianInstrument.deleteMany({ where: { musicianProfileId: profile.id } });
    if (instruments.length > 0) {
      await prisma.musicianInstrument.createMany({
        data: instruments.map((i) => ({ musicianProfileId: profile.id, instrument: i.instrument, proficiency: i.proficiency })),
      });
    }
  }

  // Replace genres
  if (genres !== undefined) {
    await prisma.musicianGenre.deleteMany({ where: { musicianProfileId: profile.id } });
    if (genres.length > 0) {
      await prisma.musicianGenre.createMany({
        data: genres.map((g) => ({ musicianProfileId: profile.id, genre: g })),
      });
    }
  }

  const updated = await prisma.musicianProfile.findUnique({
    where: { userId },
    include: { instruments: true, genres: true },
  });

  const { areaLat: _l1, areaLng: _l2, ...safeUpdated } = updated!;
  return ok(safeUpdated);
}
