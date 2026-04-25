/**
 * 定期セッション情報 (SessionTendency) から今後の JamSession を自動生成する
 *
 * 仕組み:
 * - 有効 (isActive=true) な SessionTendency を全件取得
 * - typicalDayOfWeek が設定されているものについて、今後 WEEKS_AHEAD 週分の日程を計算
 * - 重複チェックして未生成の JamSession のみ作成
 * - sessionAdmin は NearJam Bot ユーザー
 *
 * 使い方:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-recurring-sessions.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-recurring-sessions.ts --weeks=8
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-recurring-sessions.ts --dry-run
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../src/lib/prisma';
import { BOT_USER_ID } from './constants';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const weeksArg = args.find(a => a.startsWith('--weeks='));
const WEEKS_AHEAD = weeksArg ? parseInt(weeksArg.replace('--weeks=', ''), 10) : 6;

// 生成元セッション情報のマーカー（description に埋め込む）
const TENDENCY_ID_PREFIX = '[tendency:';

/**
 * JSTとして現地時刻を基準にした JST 0:00 の Date を返す
 */
function jstMidnight(date: Date): Date {
  const jstStr = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date).replace(/\//g, '-');
  return new Date(`${jstStr}T00:00:00+09:00`);
}

/**
 * typicalStartTime ("HH:MM") と日付から UTC の Date を生成する（JST として解釈）
 */
function buildStartsAt(date: Date, startTime: string | null | undefined): Date | null {
  if (!startTime) return null;
  const [h, m] = startTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;

  const midnight = jstMidnight(date);
  return new Date(midnight.getTime() + h * 3_600_000 + m * 60_000);
}

/**
 * 今日から WEEKS_AHEAD 週後までの、指定した曜日の日付リストを返す
 */
function getUpcomingDates(dayOfWeek: number, weeksAhead: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates: Date[] = [];

  for (let w = 0; w <= weeksAhead; w++) {
    const d = new Date(today);
    // 今週の dayOfWeek を探す（日=0〜土=6）
    const currentDay = d.getDay();
    const diff = ((dayOfWeek - currentDay) + 7) % 7;
    d.setDate(d.getDate() + diff + w * 7);

    // 今日 or 未来のみ
    if (d >= today) {
      dates.push(new Date(d));
    }
  }

  return [...new Set(dates.map(d => d.toDateString()))].map(s => new Date(s));
}

async function getExistingTendencyIds(): Promise<Set<string>> {
  const sessions = await prisma.jamSession.findMany({
    where: {
      sessionAdminId: BOT_USER_ID,
      description: { contains: TENDENCY_ID_PREFIX },
      startsAt: { gte: new Date() },
    },
    select: { description: true, startsAt: true },
  });

  const keys = new Set<string>();
  for (const s of sessions) {
    // "[tendency:xxxx] YYYY-MM-DD" のキーで重複チェック
    const match = s.description?.match(/\[tendency:([^\]]+)\]/);
    if (match) {
      const dateStr = s.startsAt.toISOString().slice(0, 10);
      keys.add(`${match[1]}_${dateStr}`);
    }
  }
  return keys;
}

async function main() {
  console.log(`🎷 定期セッション → JamSession 自動生成`);
  console.log(`   対象: 今後 ${WEEKS_AHEAD} 週間${DRY_RUN ? '  [DRY RUN]' : ''}`);

  const bot = await prisma.user.findUnique({ where: { id: BOT_USER_ID } });
  if (!bot) {
    console.error('❌ Bot ユーザーが存在しません。先に seed-bot-user.ts を実行してください。');
    process.exit(1);
  }

  const tendencies = await prisma.sessionTendency.findMany({
    where: {
      isActive: true,
      typicalDayOfWeek: { not: null },
      sourceType: 'AUTO_COLLECTED',
      sourceUrl: { not: null },
    },
    include: {
      venue: { select: { id: true, name: true } },
    },
  });

  console.log(`   定期セッション情報: ${tendencies.length} 件`);

  const existingKeys = await getExistingTendencyIds();
  console.log(`   既存生成済みセッション: ${existingKeys.size} 件`);

  let created = 0;
  let skipped = 0;

  for (const tendency of tendencies) {
    if (tendency.typicalDayOfWeek == null) continue;

    const dates = getUpcomingDates(tendency.typicalDayOfWeek, WEEKS_AHEAD);

    for (const date of dates) {
      const startsAt = buildStartsAt(date, tendency.typicalStartTime);
      if (!startsAt) continue;

      // 過去は除外
      if (startsAt < new Date()) continue;

      const dateStr = startsAt.toISOString().slice(0, 10);
      const key = `${tendency.id}_${dateStr}`;

      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      const description = [
        tendency.atmosphere ?? '',
        tendency.levelRange ? `参加レベル: ${tendency.levelRange}` : '',
        tendency.entrySystem ? `入場: ${tendency.entrySystem}` : '',
        '',
        `${TENDENCY_ID_PREFIX}${tendency.id}] 定期セッション: ${tendency.name}`,
      ].filter(Boolean).join('\n').trim();

      if (!DRY_RUN) {
        await prisma.jamSession.create({
          data: {
            sessionAdminId: BOT_USER_ID,
            venueId: tendency.venueId ?? undefined,
            title: tendency.name,
            startsAt,
            format: 'OPEN',
            registrationRequired: false,
            description,
            moodFlags: [],
          },
        });
        existingKeys.add(key);
      }

      created++;
      if (created <= 5 || DRY_RUN) {
        console.log(`  ${DRY_RUN ? '[DRY]' : '✅'} ${tendency.name} @ ${tendency.venue?.name ?? '不明'} — ${dateStr}`);
      } else if (created === 6) {
        console.log('  ...(以下省略)');
      }
    }
  }

  console.log(`\n📊 完了: 生成=${created}, スキップ=${skipped}`);

  if (!DRY_RUN) {
    const upcomingCount = await prisma.jamSession.count({
      where: { startsAt: { gte: new Date() } },
    });
    console.log(`   今後の JamSession 総数: ${upcomingCount} 件`);
  }
}

main()
  .catch(err => {
    console.error('エラー:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
