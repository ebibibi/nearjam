import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

const ClaimSchema = z.object({
  // MANUAL モード用：管理者の手動承認
  method: z.enum(['MANUAL']),
});

/**
 * 会場オーナー申請（MANUAL モード）
 * HP_EMAIL/SNS_CODE は verify エンドポイントで別途処理
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: venueId } = await params;
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { ownerId: true, disputedAt: true },
  });
  if (!venue) return err('Venue not found', 404);
  if (venue.disputedAt) return err('This venue is under ownership dispute', 409);
  if (venue.ownerId && venue.ownerId !== userId) {
    return err('This venue already has an owner', 409);
  }

  const body = await req.json().catch(() => null);
  const parsed = ClaimSchema.safeParse(body);
  if (!parsed.success) return err('method must be MANUAL', 400);

  // MANUAL: ownerId を設定するが verifiedAt は null のまま（管理者承認待ち）
  const updated = await prisma.venue.update({
    where: { id: venueId },
    data: { ownerId: userId },
    select: { id: true, name: true, ownerId: true, verifiedAt: true },
  });

  return ok({ ...updated, message: 'Ownership claim submitted. Awaiting admin verification.' }, 201);
}
