import { prisma } from '../lib/prisma';
import { type ExtractionResult, type ExtractedSessionTendency } from './types';

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

/**
 * セッション名がない場合に曜日・ジャンル・会場名からフォールバック名を生成する。
 * 例: "木曜ジャズセッション" / "Birdland セッション"
 */
function generateSessionName(
  s: ExtractedSessionTendency,
  venueName?: string,
): string | null {
  const dayPart = s.typicalDayOfWeek !== undefined ? `${DAY_NAMES[s.typicalDayOfWeek]}曜` : '';
  const genrePart = s.genres?.[0] ?? 'ジャム';
  if (dayPart) return `${dayPart}${genrePart}セッション`;
  if (venueName) return `${venueName} セッション`;
  return null;
}

// 自動承認しきい値: この信頼度以上であればレビューなしでサイトに表示する
const AUTO_APPROVE_CONFIDENCE = 0.7;

/**
 * 抽出結果をDBに保存する。
 * - Venue は websiteUrl で重複チェックし、なければ新規作成・あれば更新しない（オーナー編集を上書きしない）
 * - SessionTendency は sourceUrl で重複チェック
 * - いずれも sourceType = AUTO_COLLECTED で保存
 * - confidence >= AUTO_APPROVE_CONFIDENCE なら isActive = true（自動承認）
 * - それ未満は isActive = false（人間レビュー待ち）
 */
export async function saveExtractionResult(
  result: ExtractionResult,
  sourceUrl: string,
  jobId?: string,
): Promise<{ venueId: string | null; tendencyIds: string[] }> {
  let venueId: string | null = null;
  const tendencyIds: string[] = [];

  // ── 1. 会場情報の保存 ──────────────────────────────────────
  if (result.venue) {
    const v = result.venue;

    // websiteUrl か sourceUrl で既存会場を検索
    const existing = v.websiteUrl
      ? await prisma.venue.findFirst({ where: { websiteUrl: v.websiteUrl } })
      : null;

    if (existing) {
      // すでに存在する会場: venueId だけ使い、データは上書きしない
      venueId = existing.id;
      console.log(`  会場 "${v.name}" は既存 (id=${venueId})`);
    } else {
      // 新規会場を作成（isActive フラグがないのでそのまま作成、tendencies で管理）
      const created = await prisma.venue.create({
        data: {
          name: v.name,
          address: v.address,
          nearestStation: v.nearestStation,
          walkMinutes: v.walkMinutes,
          websiteUrl: v.websiteUrl,
          instagramUrl: v.instagramUrl,
          xUrl: v.xUrl,
          facebookUrl: v.facebookUrl,
          bookingUrl: v.bookingUrl,
          bookingPhone: v.bookingPhone,
        },
      });
      venueId = created.id;
      console.log(`  会場 "${v.name}" を新規作成 (id=${venueId})`);
    }

    // AutoCollectionJob に venueId を紐付け
    if (jobId && venueId) {
      await prisma.autoCollectionJob.update({
        where: { id: jobId },
        data: { venueId, lastStatus: 'success', lastFetchedAt: new Date() },
      });
    }
  }

  // ── 2. セッション情報の保存 ──────────────────────────────────
  for (const s of result.sessions ?? []) {
    // name がない場合は曜日・ジャンル・会場名から生成
    const sessionName = s.name ?? generateSessionName(s, result.venue?.name);
    if (!sessionName) {
      console.warn('  セッションをスキップ: name を生成できません');
      continue;
    }

    // 同じ sourceUrl + セッション名で重複チェック
    const existing = await prisma.sessionTendency.findFirst({
      where: { sourceUrl, name: sessionName },
    });

    if (existing) {
      console.log(`  セッション "${sessionName}" は既存 (id=${existing.id})`);
      tendencyIds.push(existing.id);
      continue;
    }

    if (!venueId) {
      console.warn(`  セッション "${sessionName}" をスキップ: 会場IDが不明`);
      continue;
    }

    const autoApproved = result.confidence >= AUTO_APPROVE_CONFIDENCE;
    const created = await prisma.sessionTendency.create({
      data: {
        venueId,
        name: sessionName,
        typicalDayOfWeek: s.typicalDayOfWeek,
        typicalStartTime: s.typicalStartTime,
        typicalEndTime: s.typicalEndTime,
        genres: s.genres ?? [],
        atmosphere: s.atmosphere,
        levelRange: s.levelRange,
        entrySystem: s.entrySystem,
        capacity: s.capacity,
        sourceType: 'AUTO_COLLECTED',
        sourceUrl,
        isActive: autoApproved,
      },
    });
    tendencyIds.push(created.id);
    const label = autoApproved ? '✅ 自動承認' : '⏳ レビュー待ち';
    console.log(`  セッション "${sessionName}" を新規作成 (id=${created.id}) ${label}`);
  }

  return { venueId, tendencyIds };
}
