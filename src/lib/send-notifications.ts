import { prisma } from './prisma';
import { sendMatchSessionEmail } from './email';

interface SendResult {
  processed: number;
  succeeded: number;
  failed: number;
}

/**
 * scheduledFor <= now() かつ sent = false の Notification を処理してメールを送信する。
 * PRD §4: 翌朝 6:00 JST にまとめて送信することで、タイミング相関攻撃を防ぐ。
 */
export async function processScheduledNotifications(): Promise<SendResult> {
  const now = new Date();

  const notifications = await prisma.notification.findMany({
    where: {
      sent: false,
      scheduledFor: { lte: now },
    },
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    // 一度に最大 100 件処理（過負荷防止）
    take: 100,
    orderBy: { scheduledFor: 'asc' },
  });

  const result: SendResult = { processed: notifications.length, succeeded: 0, failed: 0 };

  if (notifications.length === 0) {
    console.log('[send-notifications] 未送信通知なし');
    return result;
  }

  console.log(`[send-notifications] ${notifications.length} 件の通知を処理します`);

  for (const notification of notifications) {
    const { user } = notification;

    if (!user.email) {
      console.warn(`[send-notifications] userId=${notification.userId} にメールアドレスがないためスキップ`);
      await markSent(notification.id);
      result.processed--;
      continue;
    }

    try {
      const sent = await dispatchNotification(notification, user);
      if (sent) {
        result.succeeded++;
      } else {
        result.failed++;
      }
      // 成功・失敗に関わらず sent = true にして再送しない
      await markSent(notification.id);
    } catch (err) {
      console.error(`[send-notifications] id=${notification.id} の処理でエラー:`, err);
      result.failed++;
      await markSent(notification.id);
    }
  }

  console.log(`[send-notifications] 完了: 成功=${result.succeeded}, 失敗=${result.failed}`);
  return result;
}

async function dispatchNotification(
  notification: { id: string; type: string; payload: unknown },
  user: { email: string | null; name: string | null },
): Promise<boolean> {
  if (!user.email) return false;
  const recipientName = user.name ?? user.email;

  if (notification.type === 'MATCH_SESSION') {
    return dispatchMatchSession(notification.payload, user.email, recipientName);
  }

  // 未対応の通知タイプは警告のみ（将来の型追加に備えて graceful）
  console.warn(`[send-notifications] 未対応の通知タイプ: ${notification.type}`);
  return true;
}

async function dispatchMatchSession(
  payload: unknown,
  recipientEmail: string,
  recipientName: string,
): Promise<boolean> {
  const p = payload as {
    sessionId?: string;
    songTitle?: string;
    isSyncroom?: boolean;
  };

  if (!p.sessionId || !p.songTitle) {
    console.warn('[send-notifications] MATCH_SESSION payload が不正:', payload);
    return false;
  }

  // セッション情報を取得してメールを組み立てる
  const session = await prisma.jamSession.findUnique({
    where: { id: p.sessionId },
    select: {
      title: true,
      startsAt: true,
      venue: { select: { name: true } },
      studio: { select: { name: true } },
    },
  });

  if (!session) {
    console.warn(`[send-notifications] sessionId=${p.sessionId} が見つかりません`);
    return false;
  }

  const venueName = session.venue?.name ?? session.studio?.name ?? '会場未定';
  const sessionDate = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  }).format(new Date(session.startsAt));

  return sendMatchSessionEmail({
    recipientEmail,
    recipientName,
    sessionId: p.sessionId,
    sessionTitle: session.title,
    sessionDate,
    songTitle: p.songTitle,
    venueName,
    locale: 'ja',
  });
}

async function markSent(id: string): Promise<void> {
  await prisma.notification.update({
    where: { id },
    data: { sent: true, sentAt: new Date() },
  });
}
