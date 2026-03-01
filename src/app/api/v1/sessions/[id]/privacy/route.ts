import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

const PrivacySettingsSchema = z.object({
  visSessionFact: z.boolean().optional(),
  visDatetime: z.boolean().optional(),
  visSessionName: z.boolean().optional(),
  visSongListVenue: z.boolean().optional(),
  adminConsentVisSongList: z.boolean().optional(),
});

/** セッションのプライバシー設定を取得 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id: jamSessionId } = await params;

  const [privacySettings, adminConsent] = await Promise.all([
    prisma.jamSessionPrivacySettings.findUnique({ where: { jamSessionId } }),
    prisma.jamSessionAdminConsent.findUnique({ where: { jamSessionId } }),
  ]);

  return ok({ privacySettings, adminConsent });
}

/** セッション管理者がプライバシー設定を更新 */
export async function PUT(req: NextRequest, { params }: Params) {
  const { id: jamSessionId } = await params;
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const session = await prisma.jamSession.findUnique({
    where: { id: jamSessionId },
    select: { sessionAdminId: true },
  });
  if (!session) return err('Session not found', 404);
  if (session.sessionAdminId !== userId) return err('Forbidden', 403);

  const body = await req.json().catch(() => null);
  const parsed = PrivacySettingsSchema.safeParse(body);
  if (!parsed.success) return err('Invalid input', 400);

  const { adminConsentVisSongList, ...settingsData } = parsed.data;

  const [privacySettings, adminConsent] = await Promise.all([
    // JamSessionPrivacySettings (会場・セッションレベル)
    Object.keys(settingsData).length > 0
      ? prisma.jamSessionPrivacySettings.upsert({
          where: { jamSessionId },
          create: { jamSessionId, controlledById: userId, ...settingsData },
          update: settingsData,
        })
      : Promise.resolve(null),
    // JamSessionAdminConsent (セッション管理者の曲リスト同意)
    adminConsentVisSongList !== undefined
      ? prisma.jamSessionAdminConsent.upsert({
          where: { jamSessionId },
          create: { jamSessionId, sessionAdminId: userId, visSongList: adminConsentVisSongList },
          update: { visSongList: adminConsentVisSongList },
        })
      : Promise.resolve(null),
  ]);

  return ok({ privacySettings, adminConsent });
}
