/**
 * 重複会場の検出・マージスクリプト
 *
 * 同名かつ同住所の会場を重複として検出し、
 * 最も情報が充実している会場に他のデータをマージして削除する。
 *
 * 使い方:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/dedup-venues.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/dedup-venues.ts --dry-run
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../src/lib/prisma';

const DRY_RUN = process.argv.includes('--dry-run');

/** 会場の情報充実度スコアを計算する（高いほど情報が多い） */
function venueScore(v: { nearestStation: string | null; websiteUrl: string | null; address: string | null; walkMinutes: number | null; instagramUrl: string | null; xUrl: string | null }): number {
  return (v.nearestStation ? 2 : 0)
    + (v.address ? 1 : 0)
    + (v.websiteUrl ? 3 : 0)
    + (v.walkMinutes != null ? 1 : 0)
    + (v.instagramUrl ? 1 : 0)
    + (v.xUrl ? 1 : 0);
}

async function main() {
  console.log(`🔍 重複会場の検出${DRY_RUN ? ' [DRY RUN]' : ''}`);

  const venues = await prisma.venue.findMany({
    select: {
      id: true,
      name: true,
      address: true,
      nearestStation: true,
      websiteUrl: true,
      walkMinutes: true,
      instagramUrl: true,
      xUrl: true,
      createdAt: true,
      _count: { select: { tendencies: true, jamSessions: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // name でグルーピング
  const byName = new Map<string, typeof venues>();
  for (const v of venues) {
    const key = v.name.toLowerCase().trim();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(v);
  }

  let mergedCount = 0;
  let deletedCount = 0;

  for (const [name, group] of byName) {
    if (group.length <= 1) continue;

    // 住所の先頭15文字で重複グループを絞り込む
    const subGroups = new Map<string, typeof group>();
    for (const v of group) {
      const addrKey = v.address ? v.address.slice(0, 15) : '__no_address__';
      if (!subGroups.has(addrKey)) subGroups.set(addrKey, []);
      subGroups.get(addrKey)!.push(v);
    }

    for (const [addrKey, dupes] of subGroups) {
      if (dupes.length <= 1) continue;

      // スコア最高の会場を「正」とする
      dupes.sort((a, b) => venueScore(b) - venueScore(a) || b._count.tendencies - a._count.tendencies);
      const keeper = dupes[0];
      const toDelete = dupes.slice(1);

      console.log(`\n📍 重複発見: "${name}" (${addrKey})`);
      console.log(`   保持: ${keeper.id} (tendencies=${keeper._count.tendencies}, score=${venueScore(keeper)})`);
      toDelete.forEach(d => console.log(`   削除: ${d.id} (tendencies=${d._count.tendencies}, score=${venueScore(d)})`));

      if (!DRY_RUN) {
        // tendencies と jamSessions を keeper に移動
        for (const dup of toDelete) {
          const [movedTendencies, movedSessions] = await Promise.all([
            prisma.sessionTendency.updateMany({
              where: { venueId: dup.id },
              data: { venueId: keeper.id },
            }),
            prisma.jamSession.updateMany({
              where: { venueId: dup.id },
              data: { venueId: keeper.id },
            }),
          ]);
          console.log(`   → tendency ${movedTendencies.count}件, session ${movedSessions.count}件を移動`);

          // keeper に欠けているフィールドを補完
          if (!keeper.nearestStation && dup.nearestStation) {
            await prisma.venue.update({ where: { id: keeper.id }, data: { nearestStation: dup.nearestStation, walkMinutes: dup.walkMinutes } });
            keeper.nearestStation = dup.nearestStation;
          }
          if (!keeper.websiteUrl && dup.websiteUrl) {
            await prisma.venue.update({ where: { id: keeper.id }, data: { websiteUrl: dup.websiteUrl } });
          }

          // AutoCollectionJob の venueId も更新
          await prisma.autoCollectionJob.updateMany({
            where: { venueId: dup.id },
            data: { venueId: keeper.id },
          });

          // 重複会場を削除
          await prisma.venue.delete({ where: { id: dup.id } });
          deletedCount++;
        }
        mergedCount++;
      }
    }
  }

  console.log(`\n✅ 完了: ${mergedCount} グループをマージ、${deletedCount} 件の重複会場を削除`);
}

main()
  .catch((err) => {
    console.error('エラー:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
