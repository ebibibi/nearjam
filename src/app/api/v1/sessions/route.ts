import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err, parsePagination } from '@/lib/api-utils';
import { CreateSessionSchema } from '@/schemas/session';
import { createMatchNotifications } from '@/lib/matching';

// Simple rate-limit store (in-memory, per process)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, maxPerHour = 5): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(userId, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= maxPerHour) return false;
  entry.count++;
  return true;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const { limit, skip } = parsePagination(sp);
  const genre = sp.get('genre');
  const syncroomOnly = sp.get('syncroom') === 'true';
  const dateFrom = sp.get('from');

  const sessions = await prisma.jamSession.findMany({
    where: {
      ...(syncroomOnly ? { isSyncroom: true } : {}),
      ...(dateFrom ? { startsAt: { gte: new Date(dateFrom) } } : { startsAt: { gte: new Date() } }),
    },
    take: limit,
    skip,
    orderBy: { startsAt: 'asc' },
    include: {
      venue: { select: { id: true, name: true, nearestStation: true } },
      studio: { select: { id: true, name: true } },
      _count: { select: { registrations: true } },
    },
  });

  return ok(sessions);
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  if (!checkRateLimit(userId)) {
    return err('Rate limit exceeded (5 sessions per hour)', 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }

  const { startsAt, ...restData } = parsed.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createData: any = {
    ...restData,
    startsAt: new Date(startsAt),
    sessionAdminId: userId,
  };
  const session = await prisma.jamSession.create({
    data: createData,
    include: {
      venue: { select: { id: true, name: true } },
    },
  });

  // Fire-and-forget: マッチング通知作成（失敗してもセッション作成には影響しない）
  void createMatchNotifications(session.id);

  return ok(session, 201);
}
