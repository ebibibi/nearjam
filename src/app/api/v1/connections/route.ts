import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

const CreateConnectionSchema = z.object({
  toUserId: z.string().min(1),
});

/** 自分のコネクション一覧（pending/accepted）を取得 */
export async function GET(_req: NextRequest) {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const [sent, received] = await Promise.all([
    prisma.connection.findMany({
      where: { fromUserId: userId },
      include: { toUser: { select: { id: true, nickname: true, image: true } } },
    }),
    prisma.connection.findMany({
      where: { toUserId: userId },
      include: { fromUser: { select: { id: true, nickname: true, image: true } } },
    }),
  ]);

  return ok({ sent, received });
}

/** コネクション申請を送る */
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const body = await req.json().catch(() => null);
  const parsed = CreateConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }
  const { toUserId } = parsed.data;

  if (toUserId === userId) return err('Cannot connect with yourself', 400);

  const now = new Date();

  // 自分→相手 の既存レコードをチェック
  const existing = await prisma.connection.findUnique({
    where: { fromUserId_toUserId: { fromUserId: userId, toUserId } },
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') return err('Already connected', 409);
    if (existing.status === 'PENDING') return err('Connection already pending', 409);

    // REJECTED: クールダウン・永久ブロックチェック
    if (existing.rejectCount >= 3) {
      return err('Connection requests permanently blocked', 403);
    }
    if (existing.cooldownUntil && existing.cooldownUntil > now) {
      return err('Connection request on cooldown', 403);
    }

    // クールダウン解除 → PENDING に戻して再申請
    const updated = await prisma.connection.update({
      where: { id: existing.id },
      data: {
        status: 'PENDING',
        requestedAt: now,
        rejectedAt: null,
        cooldownUntil: null,
      },
    });
    return ok(updated, 201);
  }

  // 相手→自分 の拒否履歴チェック（相手が自分からの申請を3回断った場合は永久ブロック）
  const reverse = await prisma.connection.findUnique({
    where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: userId } },
    select: { rejectCount: true },
  });
  if (reverse && reverse.rejectCount >= 3) {
    return err('Connection requests blocked', 403);
  }

  const connection = await prisma.connection.create({
    data: { fromUserId: userId, toUserId },
  });

  return ok(connection, 201);
}
