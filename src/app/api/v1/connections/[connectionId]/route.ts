import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ connectionId: string }> };

const ActionSchema = z.object({
  action: z.enum(['accept', 'reject', 'cancel']),
});

/** コネクション申請を承認/拒否/キャンセルする */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { connectionId } = await params;

  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const connection = await prisma.connection.findUnique({ where: { id: connectionId } });
  if (!connection) return err('Not found', 404);

  const body = await req.json().catch(() => null);
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) return err('action must be accept, reject, or cancel', 400);

  const { action } = parsed.data;

  if (action === 'cancel') {
    // 申請者本人がキャンセル
    if (connection.fromUserId !== userId) return err('Forbidden', 403);
    await prisma.connection.delete({ where: { id: connectionId } });
    return ok({ ok: true });
  }

  // 受信者のみ承認/拒否できる
  if (connection.toUserId !== userId) return err('Forbidden', 403);
  if (connection.status !== 'PENDING') return err('Already processed', 409);

  if (action === 'accept') {
    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });
    return ok(updated);
  }

  // reject: REJECTED ステータスに変更、rejectCount++、30日クールダウン設定
  const cooldownUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.connection.update({
    where: { id: connectionId },
    data: {
      status: 'REJECTED',
      rejectCount: { increment: 1 },
      rejectedAt: new Date(),
      cooldownUntil,
    },
  });

  return ok({ ok: true, rejected: true, cooldownUntil });
}
