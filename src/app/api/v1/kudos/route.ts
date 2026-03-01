import { prisma } from '@/lib/prisma';
import { requireAuth, ok } from '@/lib/api-utils';

/** 自分が受け取った Kudos 一覧 */
export async function GET() {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const kudos = await prisma.kudos.findMany({
    where: { toUserId: userId },
    include: {
      fromUser: { select: { id: true, nickname: true, image: true } },
      jamSession: { select: { id: true, title: true, startsAt: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return ok(kudos);
}
