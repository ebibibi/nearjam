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

  // 既に申請中 or 承認済みなら拒否
  const existing = await prisma.connection.findUnique({
    where: { fromUserId_toUserId: { fromUserId: userId, toUserId } },
  });
  if (existing) return err('Connection already exists', 409);

  // 相手から拒否された回数が3回以上なら申請不可（PRD §5.2）
  const rejected = await prisma.connection.findUnique({
    where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: userId } },
    select: { rejectCount: true },
  });
  if (rejected && rejected.rejectCount >= 3) {
    return err('Connection requests blocked', 403);
  }

  const connection = await prisma.connection.create({
    data: { fromUserId: userId, toUserId },
  });

  return ok(connection, 201);
}
