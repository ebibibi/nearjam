import { NextRequest, NextResponse } from 'next/server';
import { processScheduledNotifications } from '@/lib/send-notifications';

/**
 * POST /api/v1/cron/send-notifications
 *
 * スケジューラーや外部 cron から呼び出されるエンドポイント。
 * Authorization: Bearer <CRON_SECRET> ヘッダーで認証する。
 *
 * 使い方:
 *   curl -X POST https://nearjam.app/api/v1/cron/send-notifications \
 *     -H "Authorization: Bearer <CRON_SECRET>"
 */
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET が未設定の本番環境ではエンドポイントを無効化
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron endpoint not configured' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processScheduledNotifications();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/send-notifications] エラー:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
