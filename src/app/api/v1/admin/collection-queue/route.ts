import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

/** 管理者のみアクセス可能 */
async function requireAdmin() {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'ADMIN') return err('Forbidden: admin only', 403);
  return { userId };
}

/** pending_review のコレクションジョブ一覧 */
export async function GET() {
  const adminResult = await requireAdmin();
  if ('status' in adminResult) return adminResult;

  const jobs = await prisma.autoCollectionJob.findMany({
    where: { lastStatus: 'pending_review' },
    include: {
      venue: { select: { id: true, name: true } },
      studio: { select: { id: true, name: true } },
    },
    orderBy: { lastFetchedAt: 'desc' },
    take: 50,
  });

  return ok(jobs);
}

/** pending_review の SessionTendency（承認待ち傾向データ） */
export async function POST(req: NextRequest) {
  const adminResult = await requireAdmin();
  if ('status' in adminResult) return adminResult;

  const { venueId, page = 1 } = await req.json().catch(() => ({}));
  const skip = (Number(page) - 1) * 20;

  const [total, tendencies] = await Promise.all([
    prisma.sessionTendency.count({ where: { isActive: false, sourceType: 'AUTO_COLLECTED', ...(venueId ? { venueId } : {}) } }),
    prisma.sessionTendency.findMany({
      where: { isActive: false, sourceType: 'AUTO_COLLECTED', ...(venueId ? { venueId } : {}) },
      include: { venue: { select: { id: true, name: true, address: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      skip,
    }),
  ]);

  return ok({ tendencies, total, page: Number(page) });
}
