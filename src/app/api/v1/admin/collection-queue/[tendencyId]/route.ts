import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ tendencyId: string }> };

async function requireAdmin() {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') return err('Forbidden: admin only', 403);
  return { userId };
}

const ApproveSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

/** 承認 or 却下 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { tendencyId } = await params;
  const adminResult = await requireAdmin();
  if ('status' in adminResult) return adminResult;

  const body = await req.json().catch(() => null);
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) return err('action must be approve or reject', 400);

  if (parsed.data.action === 'approve') {
    const updated = await prisma.sessionTendency.update({
      where: { id: tendencyId },
      data: { isActive: true },
    });
    return ok(updated);
  }

  // reject: 論理削除（isActive は false のまま、updatedAt を更新して「却下済み」とする）
  await prisma.sessionTendency.delete({ where: { id: tendencyId } });
  return ok({ deleted: true });
}
