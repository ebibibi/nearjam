import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ logId: string }> };

const PatchVisibilitySchema = z.object({
  visParticipation: z.boolean().optional(),
  visInstrument: z.boolean().optional(),
  visSongPerformance: z.boolean().optional(),
  visCoPerformers: z.boolean().optional(),
});

/** 自分の演奏ログの公開範囲を更新する */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { logId } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const profile = await prisma.musicianProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return err('Profile not found', 404);

  const log = await prisma.performanceLog.findUnique({
    where: { id: logId },
    select: { id: true, musicianProfileId: true },
  });
  if (!log) return err('Log not found', 404);
  if (log.musicianProfileId !== profile.id) return err('Forbidden', 403);

  const body = await req.json().catch(() => null);
  const parsed = PatchVisibilitySchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }

  const updated = await prisma.performanceLog.update({
    where: { id: logId },
    data: parsed.data,
  });

  return ok(updated);
}
