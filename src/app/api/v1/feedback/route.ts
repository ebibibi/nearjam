import { prisma } from '@/lib/prisma';
import { requireAuth, ok } from '@/lib/api-utils';

/** 自分が受け取った匿名フィードバック一覧（セッション管理者のみ） */
export async function GET() {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const feedback = await prisma.anonymousFeedback.findMany({
    where: { toUserId: userId },
    include: {
      jamSession: { select: { id: true, title: true, startsAt: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return ok(feedback);
}
