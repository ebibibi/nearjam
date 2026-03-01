import { NextRequest } from 'next/server';
import { z } from 'zod';
import { randomInt } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';
import { sendVerificationEmail } from '@/lib/email';

type Params = { params: Promise<{ id: string }> };

const VerifySchema = z.object({
  hpUrl: z.string().url(),
  email: z.string().email(),
});

/** HP から mailto: を抽出するユーティリティ */
async function extractEmailsFromUrl(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NearJam-Verifier/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    const matches = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g) ?? [];
    const emails = matches.map((m) => m.replace('mailto:', '').toLowerCase());
    return [...new Set(emails)];
  } catch {
    return [];
  }
}

/**
 * HP メール検証の開始
 * 1. HP URL を取得して mailto: リンクを抽出
 * 2. 指定メール宛に6桁確認コードを送信
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id: venueId } = await params;
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    select: { id: true, name: true, ownerId: true, verifiedAt: true },
  });
  if (!venue) return err('Venue not found', 404);
  if (venue.ownerId && venue.ownerId !== userId) return err('Forbidden', 403);
  if (venue.verifiedAt) return err('Already verified', 409);

  const body = await req.json().catch(() => null);
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) return err(parsed.error.issues.map((e) => e.message).join(', '), 400);

  const { hpUrl, email } = parsed.data;

  // HP から抽出したメールアドレスのドメインと一致するか確認
  const extractedEmails = await extractEmailsFromUrl(hpUrl);
  const emailDomain = email.split('@')[1];
  const urlDomain = (() => { try { return new URL(hpUrl).hostname.replace('www.', ''); } catch { return null; } })();

  const isEmailOnHp = extractedEmails.includes(email.toLowerCase());
  const isDomainMatch = urlDomain && emailDomain.includes(urlDomain.split('.')[0]);

  if (!isEmailOnHp && !isDomainMatch) {
    return err('Email address not found on the provided HP URL', 400);
  }

  // 6桁確認コード生成（crypto でセキュア）
  const code = randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15分

  await prisma.venueVerificationCode.create({
    data: { venueId, claimerId: userId, email, code, expiresAt },
  });

  // ACS Email で確認コード送信
  await sendVerificationEmail({ to: email, venueName: venue.name, code });

  return ok({ message: `Verification code sent to ${email}`, expiresAt });
}

/** HP 抽出のみ（コード未送信）— フロントが候補メールを選べるよう提供 */
export async function GET(req: NextRequest, { params }: Params) {
  await params;
  const hpUrl = new URL(req.url).searchParams.get('hpUrl');
  if (!hpUrl) return err('hpUrl query param required', 400);

  const emails = await extractEmailsFromUrl(hpUrl);
  return ok({ emails });
}
