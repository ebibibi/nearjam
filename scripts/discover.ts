/**
 * NearJam 会場URL発見スクリプト（Gemini 検索版）
 *
 * Gemini CLI のウェブ検索機能で会場URLを収集し、
 * AutoCollectionJob テーブルに登録してから順次クロールする。
 *
 * 使い方:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover.ts --dry-run
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover.ts --no-crawl
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { spawnSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { z } from 'zod';
import { prisma } from '../src/lib/prisma';
import { fetchPageAsMarkdown } from '../src/crawler/fetcher';
import { extractFromMarkdown } from '../src/crawler/extractor';
import { saveExtractionResult } from '../src/crawler/saver';

// ── CLI 引数 ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const NO_CRAWL = args.includes('--no-crawl');

// ── 検索クエリ一覧 ───────────────────────────────────────────────
// 地域・ジャンルを変えて複数回検索し、幅広く収集する
const SEARCH_QUERIES = [
  '東京都内 ジャズ ジャムセッション バー ライブハウス ウェブサイトURL 20件',
  '大阪 京都 ジャズ ジャムセッション バー ライブハウス ウェブサイトURL',
  '横浜 名古屋 福岡 ジャズ ジャムセッション ライブハウス ウェブサイトURL',
  '東京 ジャムセッション スタジオ セッションバー サイトURL',
];

// ── Zod スキーマ ─────────────────────────────────────────────────
const VenueItemSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  area: z.string().optional(),
});
type VenueItem = z.infer<typeof VenueItemSchema>;

// ── Gemini 検索で会場URLを取得 ────────────────────────────────────

function searchVenuesWithGemini(query: string): VenueItem[] {
  const prompt = `${query}

実在する店舗のみを対象に、ウェブサイトURLをJSON配列で返してください。
URLは実際に存在するものだけ。SNS・食べログ・ぐるなびは除外。
形式（JSON配列のみ。説明文不要）:
[{"name": "店名", "url": "https://...", "area": "エリア名"}]`;

  const promptFile = join(tmpdir(), `nearjam-search-${Date.now()}.txt`);
  try {
    writeFileSync(promptFile, prompt, 'utf8');
    const result = spawnSync(
      'bash',
      ['-ic', `gemini -m gemini-2.5-flash -p "$(cat "${promptFile}")" 2>/dev/null`],
      { encoding: 'utf8', timeout: 90_000 },
    );

    const raw = result.stdout ?? '';

    // JSON配列を抽出（前後の文章を除去）
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      console.warn(`  ⚠️  JSON抽出失敗。出力: ${raw.slice(0, 200)}`);
      return [];
    }

    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    const items: VenueItem[] = [];
    for (const item of parsed) {
      const r = VenueItemSchema.safeParse(item);
      if (r.success) items.push(r.data);
    }
    return items;
  } catch (err) {
    console.warn(`  ⚠️  Gemini検索エラー: ${err}`);
    return [];
  } finally {
    try { unlinkSync(promptFile); } catch { /* ignore */ }
  }
}

// ── AutoCollectionJob への登録 ─────────────────────────────────

async function registerJobs(venues: VenueItem[]): Promise<Array<{ id: string; url: string }>> {
  const newJobs: Array<{ id: string; url: string }> = [];

  for (const v of venues) {
    const existing = await prisma.autoCollectionJob.findFirst({
      where: { sourceUrl: v.url },
    });
    if (existing) {
      process.stdout.write('.');
      continue;
    }

    const job = await prisma.autoCollectionJob.create({
      data: { sourceType: 'hp', sourceUrl: v.url, lastStatus: 'pending_review' },
    });
    newJobs.push({ id: job.id, url: v.url });
    console.log(`  ✅ 登録: ${v.name}（${v.area ?? '?'}）→ ${v.url}`);
  }

  return newJobs;
}

// ── クロール実行 ─────────────────────────────────────────────────

async function crawlUrl(url: string, jobId: string): Promise<'ok' | 'skip' | 'error'> {
  try {
    const { markdown, title, url: finalUrl } = await fetchPageAsMarkdown(url);

    if (markdown.length < 50) {
      await prisma.autoCollectionJob.update({
        where: { id: jobId },
        data: { lastStatus: 'low_confidence', lastFetchedAt: new Date() },
      });
      console.log(`  コンテンツ不足 (${markdown.length}文字)`);
      return 'skip';
    }

    const result = await extractFromMarkdown(markdown, finalUrl, title);

    if (result.confidence < 0.4) {
      await prisma.autoCollectionJob.update({
        where: { id: jobId },
        data: { lastStatus: 'low_confidence', lastFetchedAt: new Date() },
      });
      console.log(`  信頼度低 (${result.confidence.toFixed(2)})`);
      return 'skip';
    }

    const { venueId, tendencyIds } = await saveExtractionResult(result, finalUrl, jobId);
    console.log(`  ✅ 保存: 会場=${venueId ? '新規' : 'なし'}, セッション=${tendencyIds.length}件`);
    return 'ok';
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 200) : String(err);
    // タイムアウト・SSL等はログのみ（スタックトレースは不要）
    const brief = msg.split('\n')[0];
    console.log(`  エラー: ${brief}`);
    await prisma.autoCollectionJob.update({
      where: { id: jobId },
      data: { lastStatus: 'error', errorMessage: msg, lastFetchedAt: new Date() },
    }).catch(() => { /* ignore */ });
    return 'error';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── メイン ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🎷 NearJam 会場発見スクリプト（Gemini 検索版）');
  if (DRY_RUN) console.log('  [DRY RUN: DBへの書き込みなし]');
  if (NO_CRAWL) console.log('  [--no-crawl: URL登録のみ]');

  // Phase 1: Gemini で会場URLを検索
  const allVenues: VenueItem[] = [];
  for (const query of SEARCH_QUERIES) {
    console.log(`\n🔍 検索: "${query.slice(0, 40)}..."`);
    const found = searchVenuesWithGemini(query);
    console.log(`  ${found.length} 件取得`);
    allVenues.push(...found);
    await sleep(2000); // API レート制限対策
  }

  // 重複除去（URL正規化）
  const unique = Array.from(
    new Map(allVenues.map(v => {
      try {
        const u = new URL(v.url);
        return [u.origin + u.pathname.replace(/\/$/, ''), v];
      } catch {
        return [v.url, v];
      }
    })).values(),
  );

  console.log(`\n📋 重複除去後: ${unique.length} 件`);

  if (DRY_RUN) {
    unique.forEach((v, i) => console.log(`  ${i + 1}. ${v.name}（${v.area}）| ${v.url}`));
    return;
  }

  // Phase 2: DB登録
  console.log('\n💾 AutoCollectionJob に登録中...');
  const newJobs = await registerJobs(unique);
  console.log(`\n${newJobs.length} 件の新規ジョブを登録（${unique.length - newJobs.length} 件はスキップ済み）`);

  if (NO_CRAWL || newJobs.length === 0) {
    console.log('クロールをスキップします（npm run crawl で後から実行できます）');
    return;
  }

  // Phase 3: クロール
  console.log('\n🌐 クロール開始...');
  let ok = 0, skip = 0, error = 0;

  for (let i = 0; i < newJobs.length; i++) {
    const job = newJobs[i];
    console.log(`\n[${i + 1}/${newJobs.length}] ${job.url}`);
    const status = await crawlUrl(job.url, job.id);
    if (status === 'ok') ok++;
    else if (status === 'skip') skip++;
    else error++;
    await sleep(3000);
  }

  // 最終集計
  const [venueCount, sessionCount] = await Promise.all([
    prisma.venue.count(),
    prisma.sessionTendency.count({ where: { sourceType: 'AUTO_COLLECTED' } }),
  ]);

  console.log(`\n✨ 完了！`);
  console.log(`   今回: 成功=${ok}, スキップ=${skip}, エラー=${error}`);
  console.log(`   DB合計: 会場=${venueCount}件, クローラー収集セッション=${sessionCount}件`);
}

main()
  .catch(err => { console.error('致命的なエラー:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
