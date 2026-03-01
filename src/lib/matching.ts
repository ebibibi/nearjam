import { prisma } from './prisma';

/**
 * セッション作成時にウィッシュリストとのマッチングを行い、
 * 該当ミュージシャンに通知レコードを作成する（翌朝 6:00 に送信スケジュール）。
 *
 * PRD §3.3 matching logic + §5.2 privacy (wishlist は非公開)。
 * 実際のメール送信は別のバッチジョブが担当する。
 */
export async function createMatchNotifications(sessionId: string): Promise<void> {
  const session = await prisma.jamSession.findUnique({
    where: { id: sessionId },
    include: {
      songs: { select: { songId: true } },
      venue: { select: { lat: true, lng: true } },
    },
  });

  if (!session || session.songs.length === 0) return;

  const songIds = session.songs.map((s) => s.songId);

  // ウィッシュリストに session の曲が含まれるミュージシャンを取得
  const wishes = await prisma.songWish.findMany({
    where: { songId: { in: songIds } },
    select: {
      musicianProfile: {
        select: {
          userId: true,
          coverageAreas: {
            where: { isSyncroom: false },
            select: { areaLabel: true },
          },
        },
      },
      song: { select: { title: true } },
    },
  });

  if (wishes.length === 0) return;

  // 翌朝 6:00 JST（UTC 21:00）を scheduledFor として設定
  const scheduledFor = nextMorning6am();

  // 重複なく通知を作成（同一ユーザーへの複数マッチは1件にまとめる）
  const notified = new Set<string>();
  const notificationsData = wishes.flatMap(({ musicianProfile, song }) => {
    const userId = musicianProfile.userId;

    // セッション主催者には通知しない
    if (userId === session.sessionAdminId) return [];
    // 重複防止
    if (notified.has(userId)) return [];
    notified.add(userId);

    return [{
      userId,
      type: 'MATCH_SESSION' as const,
      payload: {
        sessionId: session.id,
        songTitle: song.title,
        isSyncroom: session.isSyncroom,
      },
      scheduledFor,
    }];
  });

  if (notificationsData.length === 0) return;

  await prisma.notification.createMany({
    data: notificationsData,
    skipDuplicates: true,
  });
}

function nextMorning6am(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  // JST 06:00 = UTC 21:00 前日
  tomorrow.setUTCHours(21, 0, 0, 0);
  return tomorrow;
}
