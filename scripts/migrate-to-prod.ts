/**
 * ローカル PostgreSQL → 本番 Azure PostgreSQL データ移行スクリプト
 *
 * 移行対象:
 *   - Venue (会場)
 *   - SessionTendency (セッション傾向、AUTO_COLLECTED のみ)
 *   - AutoCollectionJob (クロールジョブ状態)
 *
 * 実行方法:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-to-prod.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const LOCAL_URL = 'postgresql://nearjam:dev_password@localhost:5432/nearjam';
const PROD_URL = process.env.PROD_DATABASE_URL!;

if (!PROD_URL) {
  console.error('❌ PROD_DATABASE_URL 環境変数が設定されていません');
  process.exit(1);
}

function createClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString, connectionTimeoutMillis: 10000 });
  return new PrismaClient({ adapter });
}

const local = createClient(LOCAL_URL);
const prod = createClient(PROD_URL);

async function migrateVenues(): Promise<Map<string, string>> {
  const venues = await local.venue.findMany();
  console.log(`\n📍 Venue: ${venues.length} 件を移行中...`);

  const idMap = new Map<string, string>(); // localId → prodId (同じはず)
  let created = 0, skipped = 0;

  for (const v of venues) {
    try {
      const existing = await prod.venue.findUnique({ where: { id: v.id } });
      if (existing) {
        skipped++;
        idMap.set(v.id, v.id);
        continue;
      }

      await prod.venue.create({
        data: {
          id: v.id,
          name: v.name,
          address: v.address,
          lat: v.lat,
          lng: v.lng,
          nearestStation: v.nearestStation,
          walkMinutes: v.walkMinutes,
          websiteUrl: v.websiteUrl,
          instagramUrl: v.instagramUrl,
          xUrl: v.xUrl,
          facebookUrl: v.facebookUrl,
          bookingUrl: v.bookingUrl,
          bookingPhone: v.bookingPhone,
          rulesMarkdown: v.rulesMarkdown,
          // ownerId は移行しない（ユーザーデータなし）
          verifiedAt: v.verifiedAt,
          verifiedMethod: v.verifiedMethod,
          verifiedDomain: v.verifiedDomain,
          disputedAt: v.disputedAt,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        },
      });
      idMap.set(v.id, v.id);
      created++;
      process.stdout.write('.');
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 100) : String(err);
      console.warn(`\n  ⚠️  ${v.name}: ${msg}`);
    }
  }

  console.log(`\n  ✅ 作成: ${created} 件 / スキップ: ${skipped} 件`);
  return idMap;
}

async function migrateSessionTendencies(venueIdMap: Map<string, string>): Promise<void> {
  const tendencies = await local.sessionTendency.findMany({
    where: { sourceType: 'AUTO_COLLECTED' },
  });
  console.log(`\n🎷 SessionTendency (AUTO_COLLECTED): ${tendencies.length} 件を移行中...`);

  let created = 0, skipped = 0, missed = 0;

  for (const t of tendencies) {
    try {
      const prodVenueId = venueIdMap.get(t.venueId);
      if (!prodVenueId) {
        missed++;
        continue;
      }

      const existing = await prod.sessionTendency.findUnique({ where: { id: t.id } });
      if (existing) {
        skipped++;
        continue;
      }

      await prod.sessionTendency.create({
        data: {
          id: t.id,
          venueId: prodVenueId,
          name: t.name,
          typicalDayOfWeek: t.typicalDayOfWeek,
          typicalStartTime: t.typicalStartTime,
          typicalEndTime: t.typicalEndTime,
          genres: t.genres,
          atmosphere: t.atmosphere,
          levelRange: t.levelRange,
          entrySystem: t.entrySystem,
          capacity: t.capacity,
          houseEquipment: t.houseEquipment,
          equipmentDetails: t.equipmentDetails,
          sourceType: 'AUTO_COLLECTED',
          sourceUrl: t.sourceUrl,
          isActive: t.isActive,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        },
      });
      created++;
      process.stdout.write('.');
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 100) : String(err);
      console.warn(`\n  ⚠️  ${t.name}: ${msg}`);
    }
  }

  console.log(`\n  ✅ 作成: ${created} 件 / スキップ: ${skipped} 件 / 会場不明: ${missed} 件`);
}

async function migrateAutoCollectionJobs(venueIdMap: Map<string, string>): Promise<void> {
  const jobs = await local.autoCollectionJob.findMany();
  console.log(`\n🔧 AutoCollectionJob: ${jobs.length} 件を移行中...`);

  let created = 0, skipped = 0;

  for (const j of jobs) {
    try {
      const existing = await prod.autoCollectionJob.findUnique({ where: { id: j.id } });
      if (existing) {
        skipped++;
        continue;
      }

      const prodVenueId = j.venueId ? venueIdMap.get(j.venueId) : null;

      await prod.autoCollectionJob.create({
        data: {
          id: j.id,
          venueId: prodVenueId ?? null,
          studioId: null, // スタジオは未移行
          sourceType: j.sourceType,
          sourceUrl: j.sourceUrl,
          lastFetchedAt: j.lastFetchedAt,
          lastStatus: j.lastStatus,
          nextFetchAt: j.nextFetchAt,
          errorMessage: j.errorMessage,
          createdAt: j.createdAt,
        },
      });
      created++;
      process.stdout.write('.');
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 100) : String(err);
      console.warn(`\n  ⚠️  ${j.sourceUrl.slice(0, 60)}: ${msg}`);
    }
  }

  console.log(`\n  ✅ 作成: ${created} 件 / スキップ: ${skipped} 件`);
}

async function main(): Promise<void> {
  console.log('🚀 NearJam データ移行スクリプト');
  console.log(`  LOCAL: ${LOCAL_URL}`);
  console.log(`  PROD:  ${PROD_URL.replace(/:([^@]+)@/, ':***@')}`);

  // 本番DBのスキーマが存在するか確認
  const prodVenueCount = await prod.venue.count().catch(() => -1);
  if (prodVenueCount === -1) {
    console.error('❌ 本番DBに接続できません / スキーマが未適用です');
    process.exit(1);
  }
  console.log(`\n  本番DB 現在の会場数: ${prodVenueCount} 件`);

  const venueIdMap = await migrateVenues();
  await migrateSessionTendencies(venueIdMap);
  await migrateAutoCollectionJobs(venueIdMap);

  // 最終確認
  const [finalVenues, finalTendencies, finalJobs] = await Promise.all([
    prod.venue.count(),
    prod.sessionTendency.count({ where: { sourceType: 'AUTO_COLLECTED' } }),
    prod.autoCollectionJob.count(),
  ]);

  console.log('\n\n✨ 移行完了！');
  console.log(`  会場: ${finalVenues} 件`);
  console.log(`  AUTO収集セッション傾向: ${finalTendencies} 件`);
  console.log(`  クロールジョブ: ${finalJobs} 件`);
}

main()
  .catch(err => { console.error('致命的なエラー:', err); process.exit(1); })
  .finally(async () => {
    await local.$disconnect();
    await prod.$disconnect();
  });
