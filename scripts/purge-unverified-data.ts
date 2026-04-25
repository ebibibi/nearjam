/**
 * 検証不可能なデータを一括削除するスクリプト
 *
 * 対象:
 * 1. bot-nearjam-system が生成した全 JamSession
 * 2. sourceType が AUTO_COLLECTED でない SessionTendency（seed-venues.ts 由来等）
 * 3. SessionTendency も JamSession も紐付かない孤立 Venue
 *
 * 使い方:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/purge-unverified-data.ts --dry-run
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/purge-unverified-data.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../src/lib/prisma';

const DRY_RUN = process.argv.includes('--dry-run');
const BOT_USER_ID = 'bot-nearjam-system';

async function main() {
  console.log(`🗑️  検証不可能データのパージ${DRY_RUN ? ' [DRY RUN]' : ''}`);
  console.log('');

  // 1. bot 生成の JamSession を削除
  const botSessions = await prisma.jamSession.findMany({
    where: { sessionAdminId: BOT_USER_ID },
    select: { id: true, title: true, venueId: true },
  });
  console.log(`1. bot生成 JamSession: ${botSessions.length} 件`);
  if (!DRY_RUN && botSessions.length > 0) {
    const result = await prisma.jamSession.deleteMany({
      where: { sessionAdminId: BOT_USER_ID },
    });
    console.log(`   → ${result.count} 件削除`);
  }

  // 2. AUTO_COLLECTED 以外の SessionTendency を削除
  const fakeTendencies = await prisma.sessionTendency.findMany({
    where: { sourceType: { not: 'AUTO_COLLECTED' } },
    select: { id: true, name: true, sourceType: true, venueId: true },
  });
  console.log(`2. 非AUTO_COLLECTED SessionTendency: ${fakeTendencies.length} 件`);
  for (const t of fakeTendencies.slice(0, 5)) {
    console.log(`   - ${t.name} (sourceType: ${t.sourceType})`);
  }
  if (fakeTendencies.length > 5) {
    console.log(`   ... 他 ${fakeTendencies.length - 5} 件`);
  }
  if (!DRY_RUN && fakeTendencies.length > 0) {
    const result = await prisma.sessionTendency.deleteMany({
      where: { sourceType: { not: 'AUTO_COLLECTED' } },
    });
    console.log(`   → ${result.count} 件削除`);
  }

  // 3. 孤立 Venue を削除（SessionTendency も JamSession も紐付かない）
  const orphanVenues = await prisma.venue.findMany({
    where: {
      tendencies: { none: {} },
      jamSessions: { none: {} },
    },
    select: { id: true, name: true, websiteUrl: true },
  });
  console.log(`3. 孤立 Venue: ${orphanVenues.length} 件`);
  for (const v of orphanVenues.slice(0, 5)) {
    console.log(`   - ${v.name} (url: ${v.websiteUrl ?? 'なし'})`);
  }
  if (orphanVenues.length > 5) {
    console.log(`   ... 他 ${orphanVenues.length - 5} 件`);
  }
  if (!DRY_RUN && orphanVenues.length > 0) {
    const result = await prisma.venue.deleteMany({
      where: {
        tendencies: { none: {} },
        jamSessions: { none: {} },
      },
    });
    console.log(`   → ${result.count} 件削除`);
  }

  // 4. 残存データの集計
  console.log('');
  const remaining = {
    venues: await prisma.venue.count(),
    tendencies: await prisma.sessionTendency.count(),
    autoCollectedTendencies: await prisma.sessionTendency.count({
      where: { sourceType: 'AUTO_COLLECTED' },
    }),
    sessions: await prisma.jamSession.count(),
  };
  console.log('📊 残存データ:');
  console.log(`   Venue: ${remaining.venues} 件`);
  console.log(`   SessionTendency: ${remaining.tendencies} 件 (AUTO_COLLECTED: ${remaining.autoCollectedTendencies})`);
  console.log(`   JamSession: ${remaining.sessions} 件`);
}

main()
  .catch(err => {
    console.error('エラー:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
