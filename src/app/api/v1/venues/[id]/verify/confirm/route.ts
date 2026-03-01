import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

const ConfirmSchema = z.object({
  code: z.string().length(6),
  email: z.string().email(),
});

/** 確認コードを照合して会場を Verified に昇格 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: venueId } = await params;
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const body = await req.json().catch(() => null);
  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) return err('code (6 digits) and email are required', 400);

  const { code, email } = parsed.data;
  const now = new Date();

  const record = await prisma.venueVerificationCode.findFirst({
    where: { venueId, claimerId: userId, email, code, expiresAt: { gt: now } },
  });
  if (!record) return err('Invalid or expired verification code', 400);

  const emailDomain = email.split('@')[1];

  await prisma.venue.update({
    where: { id: venueId },
    data: {
      ownerId: userId,
      verifiedAt: now,
      verifiedMethod: 'HP_EMAIL',
      verifiedDomain: emailDomain,
    },
  });

  // 使用済みコードを削除
  await prisma.venueVerificationCode.deleteMany({ where: { venueId, claimerId: userId } });

  return ok({ verified: true, method: 'HP_EMAIL', domain: emailDomain });
}
