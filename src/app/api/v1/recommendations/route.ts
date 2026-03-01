import { prisma } from '@/lib/prisma';
import { requireAuth, ok, err } from '@/lib/api-utils';

/**
 * 楽曲レコメンデーション
 * PRD §4 Phase 2: 近くで演奏されたがウィッシュリスト未登録の曲
 */
export async function GET() {
  const authResult = await requireAuth();
  if ('status' in authResult) return authResult;
  const { userId } = authResult;

  const profile = await prisma.musicianProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      skillLevel: true,
      coverageAreas: { where: { isPublic: true }, select: { areaLabel: true }, take: 3 },
      wishlist: { select: { songId: true } },
    },
  });

  if (!profile) return err('Profile not found. Please set up your profile first.', 404);

  const wishlistSongIds = profile.wishlist.map((w) => w.songId);

  // 直近90日間に演奏された曲で、ウィッシュリスト未登録のもの上位20件
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // 難易度マッピング
  const difficultyMap: Record<string, string[]> = {
    BEGINNER: ['EASY', 'MEDIUM', 'VARIES'],
    INTERMEDIATE: ['EASY', 'MEDIUM', 'HARD', 'VARIES'],
    ADVANCED: ['MEDIUM', 'HARD', 'VARIES'],
    ANY: ['EASY', 'MEDIUM', 'HARD', 'VARIES'],
  };
  const allowedDifficulties = difficultyMap[profile.skillLevel] ?? ['EASY', 'MEDIUM', 'HARD', 'VARIES'];

  // 人気曲スコアリング: PerformanceLog を songId でグループ集計
  const popularSongs = await prisma.performanceLog.groupBy({
    by: ['songId'],
    where: {
      songId: { not: null, notIn: wishlistSongIds },
      performedAt: { gte: ninetyDaysAgo },
    },
    _count: { songId: true },
    orderBy: { _count: { songId: 'desc' } },
    take: 30,
  });

  const songIds = popularSongs
    .map((p) => p.songId)
    .filter((id): id is string => id !== null);

  if (songIds.length === 0) return ok([]);

  // 曲詳細を取得し、難易度フィルタを適用
  const songs = await prisma.song.findMany({
    where: {
      id: { in: songIds },
      difficulty: { in: allowedDifficulties as ('EASY' | 'MEDIUM' | 'HARD' | 'VARIES')[] },
    },
    select: {
      id: true,
      title: true,
      artist: true,
      genre: true,
      difficulty: true,
      typicalKey: true,
      wishlistCount: true,
    },
  });

  // 演奏回数でソート順を保持（groupBy の順序に合わせる）
  const countMap = new Map(popularSongs.map((p) => [p.songId, p._count.songId]));
  const sorted = songs.sort((a, b) => (countMap.get(b.id) ?? 0) - (countMap.get(a.id) ?? 0));

  const result = sorted.slice(0, 20).map((song) => ({
    ...song,
    playedNearby: countMap.get(song.id) ?? 0,
    reason: `近くで${countMap.get(song.id) ?? 0}回演奏されています`,
  }));

  return ok(result);
}
