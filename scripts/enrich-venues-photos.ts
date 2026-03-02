/**
 * Google Places API を使って全会場に写真 URL を付与するバッチスクリプト
 *
 * 使い方:
 *   GOOGLE_PLACES_API_KEY=xxx npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/enrich-venues-photos.ts
 *
 * オプション:
 *   --force   写真 URL が既にある会場も上書きする
 *   --limit N 処理する会場数の上限（デフォルト: 全件）
 *   --dry-run DBへの書き込みをスキップして結果だけ表示する
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../src/lib/prisma';
import { findPlaceId, fetchPlacePhotoUrls } from '../src/lib/google-places';

const RATE_LIMIT_MS = 200; // API レート制限対策（5 req/s 以下に抑える）
const MAX_PHOTOS = 3;

const args = process.argv.slice(2);
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');
const limitArg = args.find((a) => a.startsWith('--limit=') || a === '--limit');
const limit =
  limitArg
    ? parseInt(args[args.indexOf(limitArg) + (limitArg.includes('=') ? 0 : 1)]?.replace('--limit=', '') ?? '0', 10)
    : 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_PLACES_API_KEY が設定されていません');
    process.exit(1);
  }

  const venues = await prisma.venue.findMany({
    where: force
      ? {}
      : {
          OR: [
            { photoUrls: { isEmpty: true } },
            { googlePlaceId: null },
          ],
        },
    select: { id: true, name: true, address: true, googlePlaceId: true, photoUrls: true },
    orderBy: { createdAt: 'asc' },
    ...(limit > 0 ? { take: limit } : {}),
  });

  console.log(`🔍 処理対象: ${venues.length} 件${dryRun ? ' (dry-run)' : ''}`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const [i, venue] of venues.entries()) {
    const prefix = `[${i + 1}/${venues.length}] ${venue.name}`;

    // Place ID の取得（既にある場合は再利用）
    let placeId = venue.googlePlaceId;
    if (!placeId) {
      placeId = await findPlaceId(venue.name, venue.address);
      if (!placeId) {
        console.log(`  ${prefix}: ⚠️  Place ID が見つかりませんでした`);
        errorCount++;
        await sleep(RATE_LIMIT_MS);
        continue;
      }
      console.log(`  ${prefix}: 🔎 Place ID = ${placeId}`);
    } else {
      console.log(`  ${prefix}: ✅ Place ID 再利用 = ${placeId}`);
    }

    await sleep(RATE_LIMIT_MS);

    // 写真 URL の取得
    const photoUrls = await fetchPlacePhotoUrls(placeId, MAX_PHOTOS);

    if (photoUrls.length === 0) {
      console.log(`  ${prefix}: 📷 写真なし`);
      if (!dryRun) {
        await prisma.venue.update({
          where: { id: venue.id },
          data: {
            googlePlaceId: placeId,
            photosUpdatedAt: new Date(),
          },
        });
      }
      skipCount++;
    } else {
      console.log(`  ${prefix}: 📷 ${photoUrls.length} 枚取得`);
      if (!dryRun) {
        await prisma.venue.update({
          where: { id: venue.id },
          data: {
            googlePlaceId: placeId,
            photoUrls,
            photosUpdatedAt: new Date(),
          },
        });
      }
      successCount++;
    }

    await sleep(RATE_LIMIT_MS);
  }

  console.log('\n─────────────────────────────');
  console.log(`✅ 写真取得成功: ${successCount} 件`);
  console.log(`⚠️  写真なし:     ${skipCount} 件`);
  console.log(`❌ エラー:        ${errorCount} 件`);
  if (dryRun) console.log('📝 dry-run モード: DB への書き込みはスキップされました');
}

main()
  .catch((err) => {
    console.error('エラー:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
