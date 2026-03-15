/**
 * NearJam DB統計取得スクリプト
 *
 * weekly-crawl.sh の Phase 1（開始前統計）と Phase 6（終了後統計）で共用。
 * JSON を stdout に出力する。
 *
 * 使い方:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/db-stats.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/db-stats.ts --full
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { prisma } from '../src/lib/prisma';

const FULL = process.argv.includes('--full');

async function main(): Promise<void> {
  const [venues, sessions, success, error, low, pending] = await Promise.all([
    prisma.venue.count(),
    prisma.sessionTendency.count({ where: { sourceType: 'AUTO_COLLECTED' } }),
    prisma.autoCollectionJob.count({ where: { lastStatus: 'success' } }),
    prisma.autoCollectionJob.count({ where: { lastStatus: 'error' } }),
    prisma.autoCollectionJob.count({ where: { lastStatus: 'low_confidence' } }),
    prisma.autoCollectionJob.count({ where: { lastStatus: 'pending_review' } }),
  ]);

  const result: Record<string, unknown> = {
    venues,
    sessions,
    success,
    error,
    low,
    pending,
  };

  // --full: 都道府県分布とエラーパターンも取得（Phase 2 のプロンプト生成用）
  if (FULL) {
    const venueList = await prisma.venue.findMany({
      select: { address: true },
    });
    const areaCounts: Record<string, number> = {};
    for (const v of venueList) {
      const region =
        (v.address?.match(
          /^(東京|大阪|神奈川|愛知|福岡|北海道|京都|兵庫|埼玉|千葉|宮城|広島|静岡|熊本|鹿児島|沖縄)/,
        ) ?? ['その他'])[0];
      areaCounts[region] = (areaCounts[region] ?? 0) + 1;
    }

    const errorUrls = await prisma.autoCollectionJob.findMany({
      where: { lastStatus: 'error' },
      select: { sourceUrl: true },
      take: 20,
    });

    result.areaCounts = areaCounts;
    result.errorPatterns = errorUrls.map((u) => u.sourceUrl).join(', ');
  }

  console.log(JSON.stringify(result));
}

main()
  .catch((err) => {
    console.error('db-stats error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
