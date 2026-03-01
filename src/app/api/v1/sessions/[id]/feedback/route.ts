import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

const SendFeedbackSchema = z.object({
  toUserId: z.string().optional(),
  toVenueId: z.string().optional(),
  message: z.string().min(1).max(500),
});

/** 匿名フィードバック送信（送信者IDは保存しない） */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: jamSessionId } = await params;
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;

  const body = await req.json().catch(() => null);
  const parsed = SendFeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues.map((e) => e.message).join(', '), 400);
  }
  const { toUserId, toVenueId, message } = parsed.data;

  if (!toUserId && !toVenueId) return err('toUserId or toVenueId is required', 400);

  const session = await prisma.jamSession.findUnique({
    where: { id: jamSessionId },
    select: { id: true },
  });
  if (!session) return err('Session not found', 404);

  // 送信者IDは意図的に保存しない（完全匿名）
  const feedback = await prisma.anonymousFeedback.create({
    data: { jamSessionId, toUserId, toVenueId, message },
  });

  return ok({ id: feedback.id }, 201);
}
