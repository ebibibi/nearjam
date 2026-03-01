import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

const STAMP_OPTIONS = ['👍', '🎵', '🎉', '🌱', '✨'] as const;

const SendKudosSchema = z.object({
  toUserId: z.string().optional(),
  toVenueId: z.string().optional(),
  stamp: z.enum(STAMP_OPTIONS),
  message: z.string().max(200).optional(),
});

/** セッション内の Kudos 一覧（自分が送受したもの） */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: jamSessionId } = await params;
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const kudos = await prisma.kudos.findMany({
    where: {
      jamSessionId,
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    include: {
      fromUser: { select: { id: true, nickname: true, image: true } },
      toUser: { select: { id: true, nickname: true, image: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok(kudos);
}

/** Kudos を送る（1セッション1相手1スタンプのみ） */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: jamSessionId } = await params;
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const body = await req.json().catch(() => null);
  const parsed = SendKudosSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }
  const { toUserId, toVenueId, stamp, message } = parsed.data;

  if (!toUserId && !toVenueId) return err('toUserId or toVenueId is required', 400);
  if (toUserId === userId) return err('Cannot send kudos to yourself', 400);

  // セッション存在確認
  const session = await prisma.jamSession.findUnique({
    where: { id: jamSessionId },
    select: { id: true },
  });
  if (!session) return err('Session not found', 404);

  try {
    const kudos = await prisma.kudos.create({
      data: { jamSessionId, fromUserId: userId, toUserId, toVenueId, stamp, message },
    });
    return ok(kudos, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('Unique constraint')) {
      return err('Already sent kudos to this person in this session', 409);
    }
    throw e;
  }
}
