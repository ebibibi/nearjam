import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ userId: string }> };

/** POST: ブロック */
export async function POST(req: NextRequest, { params }: Params) {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId: blockerId } = authResult;

  const { userId: blockedId } = await params;

  if (blockerId === blockedId) {
    return err('Cannot block yourself', 400);
  }

  // 相手が存在するか確認
  const target = await prisma.user.findUnique({
    where: { id: blockedId },
    select: { id: true },
  });
  if (!target) return err('User not found', 404);

  await prisma.block.upsert({
    where: { blockerUserId_blockedUserId: { blockerUserId: blockerId, blockedUserId: blockedId } },
    create: { blockerUserId: blockerId, blockedUserId: blockedId },
    update: {},
  });

  // ブロック時に既存コネクションを削除
  await prisma.connection.deleteMany({
    where: {
      OR: [
        { fromUserId: blockerId, toUserId: blockedId },
        { fromUserId: blockedId, toUserId: blockerId },
      ],
    },
  });

  return ok({ blocked: true });
}

/** DELETE: ブロック解除 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId: blockerId } = authResult;

  const { userId: blockedId } = await params;

  await prisma.block.deleteMany({
    where: { blockerUserId: blockerId, blockedUserId: blockedId },
  });

  return NextResponse.json({ unblocked: true });
}
