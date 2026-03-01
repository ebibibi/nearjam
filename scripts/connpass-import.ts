/**
 * Connpass イベントインポーター
 *
 * Connpass の公開 API からジャムセッション関連イベントを取得し、
 * NearJam の JamSession として保存する。
 *
 * 設計方針:
 * - Connpass = 単発イベント → JamSession に保存（registrationRequired = false）
 * - 会場情報は Venue として upsert（place + address で重複チェック）
 * - sessionAdmin は NearJam Bot ユーザー（bot-nearjam-system）
 * - sourceUrl を connpass イベント URL として記録（JamSession に description で保持）
 * - 既存イベント（同 connpassId）はスキップ（description に connpassId を埋め込んで判定）
 *
 * 使い方:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/connpass-import.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/connpass-import.ts --max=50
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../src/lib/prisma';
import { BOT_USER_ID } from './seed-bot-user';

interface ConnpassEvent {
  event_id: number;
  title: string;
  catch: string;
  description: string;
  event_url: string;
  started_at: string;
  ended_at: string;
  place: string;
  address: string;
  lat: string | null;
  lon: string | null;
  limit: number | null;
  accepted: number;
  event_type: string;
}

interface ConnpassApiResponse {
  results_returned: number;
  results_available: number;
  results_start: number;
  events: ConnpassEvent[];
}

const KEYWORDS = [
  'ジャムセッション',
  'ジャズセッション',
  'セッション jazz',
  'jam session',
  'セッション blues',
  'セッション funk',
];

const BASE_URL = 'https://connpass.com/api/v1/event/';
const CONNPASS_ID_PREFIX = '[connpass:';

async function fetchConnpassEvents(keyword: string, count = 100, start = 1): Promise<ConnpassEvent[]> {
  const params = new URLSearchParams({
    keyword,
    count: String(count),
    start: String(start),
    order: '2', // 開催日時順
  });
  const url = `${BASE_URL}?${params}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'NearJamBot/1.0 (https://nearjam.app)' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Connpass API エラー: ${res.status} ${res.statusText}`);
  }

  const data: ConnpassApiResponse = await res.json();
  return data.events ?? [];
}

/** JamSession の description に埋め込んだ Connpass ID を取り出す */
function extractConnpassId(description: string | null): number | null {
  if (!description) return null;
  const match = description.match(/\[connpass:(\d+)\]/);
  return match ? parseInt(match[1], 10) : null;
}

/** 既存の Connpass インポート済みセッション ID セットを取得 */
async function getImportedConnpassIds(): Promise<Set<number>> {
  const sessions = await prisma.jamSession.findMany({
    where: {
      sessionAdminId: BOT_USER_ID,
      description: { contains: CONNPASS_ID_PREFIX },
    },
    select: { description: true },
  });

  const ids = new Set<number>();
  for (const s of sessions) {
    const id = extractConnpassId(s.description);
    if (id !== null) ids.add(id);
  }
  return ids;
}

/**
 * 会場を upsert する（同じ place 名があれば既存を返す）
 */
async function upsertVenue(event: ConnpassEvent): Promise<string | null> {
  if (!event.place) return null;

  const existing = await prisma.venue.findFirst({
    where: { name: event.place },
  });

  if (existing) return existing.id;

  const created = await prisma.venue.create({
    data: {
      name: event.place,
      address: event.address || undefined,
      lat: event.lat ? parseFloat(event.lat) : undefined,
      lng: event.lon ? parseFloat(event.lon) : undefined,
    },
  });
  return created.id;
}

async function importEvent(event: ConnpassEvent, importedIds: Set<number>): Promise<'skipped' | 'imported' | 'error'> {
  if (importedIds.has(event.event_id)) return 'skipped';

  const startsAt = new Date(event.started_at);
  if (isNaN(startsAt.getTime())) {
    console.warn(`  ⚠️ 日時パース失敗: ${event.started_at}`);
    return 'error';
  }

  // 過去6ヶ月より古いイベントはスキップ
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  if (startsAt < sixMonthsAgo) return 'skipped';

  try {
    const venueId = await upsertVenue(event);

    const durationMs = event.ended_at
      ? new Date(event.ended_at).getTime() - startsAt.getTime()
      : null;
    const durationMinutes = durationMs && durationMs > 0
      ? Math.round(durationMs / 60_000)
      : undefined;

    const description = [
      event.catch || '',
      '',
      `${CONNPASS_ID_PREFIX}${event.event_id}] 元の Connpass ページ: ${event.event_url}`,
    ].join('\n').trim();

    await prisma.jamSession.create({
      data: {
        sessionAdminId: BOT_USER_ID,
        venueId: venueId ?? undefined,
        title: event.title.slice(0, 200),
        startsAt,
        durationMinutes,
        format: 'OPEN',
        registrationRequired: false,
        maxParticipants: event.limit ?? undefined,
        description,
        moodFlags: [],
      },
    });

    importedIds.add(event.event_id);
    return 'imported';
  } catch (err) {
    console.error(`  ❌ インポート失敗 (id=${event.event_id}):`, err instanceof Error ? err.message : err);
    return 'error';
  }
}

async function main() {
  const args = process.argv.slice(2);
  const maxArg = args.find(a => a.startsWith('--max='));
  const maxPerKeyword = maxArg ? parseInt(maxArg.replace('--max=', ''), 10) : 100;

  console.log('🎷 Connpass インポーター起動');
  console.log(`   キーワード数: ${KEYWORDS.length}, 最大件数/キーワード: ${maxPerKeyword}`);

  // Bot ユーザーの存在確認
  const bot = await prisma.user.findUnique({ where: { id: BOT_USER_ID } });
  if (!bot) {
    console.error('❌ Bot ユーザーが存在しません。先に seed-bot-user.ts を実行してください。');
    process.exit(1);
  }

  const importedIds = await getImportedConnpassIds();
  console.log(`   既存インポート済み: ${importedIds.size} 件`);

  let totalImported = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const keyword of KEYWORDS) {
    console.log(`\n🔍 キーワード: "${keyword}"`);
    await sleep(1000); // レート制限対策

    try {
      const events = await fetchConnpassEvents(keyword, maxPerKeyword);
      console.log(`   取得: ${events.length} 件`);

      for (const event of events) {
        const result = await importEvent(event, importedIds);
        if (result === 'imported') {
          console.log(`  ✅ [${event.event_id}] ${event.title.slice(0, 50)}`);
          totalImported++;
        } else if (result === 'error') {
          totalErrors++;
        } else {
          totalSkipped++;
        }
        await sleep(200); // DB負荷対策
      }
    } catch (err) {
      console.error(`  ❌ API エラー (keyword=${keyword}):`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n📊 完了: インポート=${totalImported}, スキップ=${totalSkipped}, エラー=${totalErrors}`);

  const sessionCount = await prisma.jamSession.count({
    where: { sessionAdminId: BOT_USER_ID },
  });
  console.log(`   Bot ユーザーのセッション合計: ${sessionCount} 件`);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main()
  .catch(err => {
    console.error('致命的なエラー:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
