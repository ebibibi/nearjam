/**
 * 既存会場の websiteUrl をバックフィルするスクリプト。
 *
 * AutoCollectionJob.sourceUrl から会場の公式サイトURL（オリジン）を導出し、
 * websiteUrl が null の会場を一括更新する。
 *
 * Usage: npx tsx scripts/backfill-website-urls.ts [--dry-run]
 */
/**
 * NOTE: dotenv v17 の自動注入は TSX の import 順序と競合する場合がある。
 * 確実に動作させるには DATABASE_URL を環境変数で渡す:
 *   source .env.local && npx tsx scripts/backfill-website-urls.ts
 */
import { prisma } from '../src/lib/prisma';

const SNS_HOSTS = new Set([
  'twitter.com', 'x.com', 'instagram.com', 'facebook.com',
  'connpass.com', 'note.com', 'tabelog.com', 'google.com',
  'youtube.com', 'tiktok.com', 'ameblo.jp', 'livedoor.jp',
]);

function deriveWebsiteUrl(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();
    if ([...SNS_HOSTS].some(h => host === h || host.endsWith(`.${h}`))) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('=== DRY RUN モード ===\n');

  // websiteUrl が null の会場を取得
  const venuesWithoutUrl = await prisma.venue.findMany({
    where: { websiteUrl: null },
    select: { id: true, name: true },
  });

  console.log(`websiteUrl が null の会場: ${venuesWithoutUrl.length} 件\n`);

  let updated = 0;
  let skipped = 0;

  for (const venue of venuesWithoutUrl) {
    // この会場の AutoCollectionJob から sourceUrl を取得
    const jobs = await prisma.autoCollectionJob.findMany({
      where: { venueId: venue.id },
      select: { sourceUrl: true },
      orderBy: { lastFetchedAt: 'desc' },
    });

    // SessionTendency の sourceUrl もフォールバックとして使用
    const tendencies = await prisma.sessionTendency.findMany({
      where: { venueId: venue.id, sourceUrl: { not: null } },
      select: { sourceUrl: true },
    });

    const allSourceUrls = [
      ...jobs.map(j => j.sourceUrl),
      ...tendencies.map(t => t.sourceUrl).filter((u): u is string => u !== null),
    ];

    let websiteUrl: string | null = null;
    for (const url of allSourceUrls) {
      websiteUrl = deriveWebsiteUrl(url);
      if (websiteUrl) break;
    }

    if (!websiteUrl) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  [DRY] ${venue.name} → ${websiteUrl}`);
    } else {
      await prisma.venue.update({
        where: { id: venue.id },
        data: { websiteUrl },
      });
      console.log(`  ✅ ${venue.name} → ${websiteUrl}`);
    }
    updated++;
  }

  console.log(`\n完了: ${updated} 件更新, ${skipped} 件スキップ（ソースURL なし or SNS のみ）`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
