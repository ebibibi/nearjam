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

/**
 * セッション作成時に「セッションが必要としている楽器」と
 * 「ミュージシャンが演奏できる楽器」をマッチングし、通知レコードを作成する。
 *
 * PRD Phase 1 通知:「セッション近くで自分の楽器が必要」
 */
export async function createInstrumentMatchNotifications(sessionId: string): Promise<void> {
  const session = await prisma.jamSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      sessionAdminId: true,
      isSyncroom: true,
      instrumentNeeds: { select: { instrument: true } },
    },
  });

  if (!session || session.instrumentNeeds.length === 0) return;

  const neededInstruments = session.instrumentNeeds.map((n) => n.instrument.toLowerCase());

  // 必要な楽器を演奏できるミュージシャンを取得
  const matchedInstruments = await prisma.musicianInstrument.findMany({
    where: {
      instrument: { in: neededInstruments },
      musicianProfile: { userId: { not: session.sessionAdminId } },
    },
    select: {
      instrument: true,
      musicianProfile: { select: { userId: true } },
    },
  });

  if (matchedInstruments.length === 0) return;

  const scheduledFor = nextMorning6am();

  const notified = new Set<string>();
  const notificationsData = matchedInstruments.flatMap(({ instrument, musicianProfile }) => {
    const userId = musicianProfile.userId;
    if (notified.has(userId)) return [];
    notified.add(userId);

    return [{
      userId,
      type: 'MATCH_INSTRUMENT' as const,
      payload: {
        sessionId: session.id,
        instrument,
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
