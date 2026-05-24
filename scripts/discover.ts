/**
 * NearJam 会場URL発見スクリプト（LLM CLI 版）
 *
 * LLM CLI（gemini/claude/codex）のウェブ検索機能で会場URLを収集し、
 * AutoCollectionJob テーブルに登録してから順次クロールする。
 *
 * 使い方:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover.ts --dry-run
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover.ts --no-crawl
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover.ts --extra-queries-file /path/to/queries.json
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { execFileSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';
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

// --extra-queries-file <path>: JSON配列ファイルから追加クエリを読み込む
const extraQueriesFileIdx = args.indexOf('--extra-queries-file');
const EXTRA_QUERIES_FILE = extraQueriesFileIdx !== -1 ? args[extraQueriesFileIdx + 1] : null;

// ── 検索クエリ一覧（全国47都道府県 + ジャンル横断）─────────────────
const SEARCH_QUERIES = [
  // 東京 エリア別 — Jazz
  '渋谷 恵比寿 代官山 ジャズ ジャムセッション バー サイトURL',
  '新宿 歌舞伎町 高田馬場 ジャズ セッションバー サイトURL',
  '吉祥寺 下北沢 三軒茶屋 ジャズ ジャムセッション サイトURL',
  '池袋 板橋 練馬 ジャズ セッション ライブハウス サイトURL',
  '銀座 有楽町 日比谷 ジャズバー セッション サイトURL',
  '浅草 上野 錦糸町 ジャズ セッション バー サイトURL',
  '北千住 足立 葛飾 ジャズ セッション ライブハウス サイトURL',
  // 東京 ジャンル別
  '東京 ブルース ジャムセッション バー ライブハウス サイトURL',
  '東京 ファンク ジャムセッション バー ライブハウス サイトURL',
  '東京 ラテン サルサ ジャムセッション バー サイトURL',
  '東京 フュージョン ジャムセッション バー ライブハウス サイトURL',
  '東京 ロック ジャムセッション バー ライブハウス サイトURL',
  '東京 R&B ソウル ジャムセッション バー サイトURL',
  '東京 ボサノバ ジャムセッション カフェ サイトURL',
  '東京 ゴスペル ジャムセッション サイトURL',
  // 関東
  '横浜 川崎 神奈川 ジャズ ジャムセッション バー サイトURL',
  '横浜 川崎 神奈川 ブルース ファンク ジャムセッション サイトURL',
  '埼玉 浦和 大宮 ジャズ ジャムセッション ライブハウス サイトURL',
  '千葉 船橋 柏 ジャズ セッション バー サイトURL',
  '千葉 船橋 柏 ブルース ロック ジャムセッション サイトURL',
  '宇都宮 栃木 茨城 水戸 ジャズ セッション サイトURL',
  '前橋 高崎 群馬 ジャズ ジャムセッション ライブハウス サイトURL',
  // 東北
  '仙台 宮城 ジャズ ジャムセッション バー ライブハウス サイトURL',
  '仙台 宮城 ブルース ロック ジャムセッション サイトURL',
  '青森 岩手 秋田 山形 福島 ジャズ セッション サイトURL',
  // 北海道
  '札幌 北海道 ジャズ ジャムセッション バー ライブハウス サイトURL',
  '札幌 北海道 ブルース ロック ジャムセッション サイトURL',
  // 中部
  '名古屋 愛知 ジャズ ジャムセッション バー ライブハウス サイトURL',
  '名古屋 愛知 ブルース ファンク ラテン ジャムセッション サイトURL',
  '静岡 浜松 ジャズ セッション バー サイトURL',
  '金沢 石川 富山 福井 ジャズ セッション ライブハウス サイトURL',
  '長野 松本 新潟 ジャズ セッション バー サイトURL',
  '岐阜 三重 ジャズ ジャムセッション ライブハウス サイトURL',
  // 関西
  '大阪 梅田 心斎橋 ジャズ ジャムセッション バー サイトURL',
  '大阪 難波 天王寺 北新地 ジャズ セッション サイトURL',
  '大阪 ブルース ファンク ラテン ジャムセッション バー サイトURL',
  '京都 ジャズ ジャムセッション バー ライブハウス サイトURL',
  '京都 ブルース ロック ジャムセッション バー サイトURL',
  '神戸 兵庫 ジャズ セッション バー ライブハウス サイトURL',
  '奈良 和歌山 滋賀 ジャズ セッション サイトURL',
  // 中国・四国
  '広島 岡山 ジャズ ジャムセッション バー ライブハウス サイトURL',
  '松山 高松 徳島 高知 ジャズ セッション サイトURL',
  '山口 鳥取 島根 ジャズ セッション サイトURL',
  // 九州・沖縄
  '福岡 博多 ジャズ ジャムセッション バー ライブハウス サイトURL',
  '福岡 博多 ブルース ファンク ラテン ジャムセッション サイトURL',
  '熊本 長崎 佐賀 大分 ジャズ セッション サイトURL',
  '鹿児島 宮崎 ジャズ セッション バー サイトURL',
  '那覇 沖縄 ジャズ セッション バー ライブハウス サイトURL',
];

// ── Zod スキーマ ─────────────────────────────────────────────────
const VenueItemSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  area: z.string().optional(),
});
type VenueItem = z.infer<typeof VenueItemSchema>;

// ── LLM CLI で会場URLを検索 ─────────────────────────────────────

// LLM CLI の選択（gemini > claude > codex）
// discover はウェブ検索機能が重要なので gemini を優先
// ただしクォータ切れ等でフォールバックする
const LLM_PATH = `${process.env.HOME}/.npm-global/bin:${process.env.HOME}/.local/bin:${process.env.PATH ?? ''}`;

function findExecutable(cmd: string): string | null {
  for (const dir of LLM_PATH.split(':')) {
    if (!dir) continue;
    try {
      execFileSync('test', ['-x', `${dir}/${cmd}`], { stdio: 'ignore' });
      return `${dir}/${cmd}`;
    } catch { /* not found */ }
  }
  return null;
}

function detectAvailableLlms(): string[] {
  const available: string[] = [];
  for (const cmd of ['gemini', 'claude', 'codex']) {
    if (findExecutable(cmd)) available.push(cmd);
  }
  return available;
}

const AVAILABLE_LLMS = detectAvailableLlms();
let currentLlmIdx = 0;
let consecutiveLlmFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

function getCurrentLlm(): string {
  if (AVAILABLE_LLMS.length === 0) {
    throw new Error('LLM CLI が見つかりません（gemini/claude/codex のいずれかをインストールしてください）');
  }
  return AVAILABLE_LLMS[currentLlmIdx % AVAILABLE_LLMS.length];
}

console.log(`  🤖 利用可能LLM: ${AVAILABLE_LLMS.join(', ')}`);

function callLlm(prompt: string): string {
  for (let attempt = 0; attempt < AVAILABLE_LLMS.length; attempt++) {
    const llm = getCurrentLlm();
    const llmPath = findExecutable(llm);
    if (!llmPath) { currentLlmIdx++; continue; }

    try {
      const output = execFileSync(llmPath, ['-p', prompt.substring(0, 8000)], {
        encoding: 'utf8',
        timeout: 30_000,
        env: { ...process.env, PATH: LLM_PATH },
        stdio: ['pipe', 'pipe', 'pipe'],
        maxBuffer: 2 * 1024 * 1024,
      });

      if (output.includes('QuotaError') || output.includes('exhausted') ||
          output.includes('rate limit') || output.includes('429')) {
        console.warn(`  ⚠️  ${llm} がエラー（クォータ切れ等）。次のLLMに切り替え...`);
        currentLlmIdx++;
        continue;
      }

      consecutiveLlmFailures = 0;
      return output;
    } catch {
      console.warn(`  ⚠️  ${llm} が実行失敗。次のLLMに切り替え...`);
      currentLlmIdx++;
      continue;
    }
  }

  consecutiveLlmFailures++;
  console.warn(`  ⚠️  全LLMが応答不能（連続${consecutiveLlmFailures}回）`);
  return '';
}

function searchVenuesWithLlm(query: string): VenueItem[] {
  const prompt = `${query}

実在する店舗のみを対象に、ウェブサイトURLをJSON配列で返してください。
URLは実際に存在するものだけ。SNS・食べログ・ぐるなびは除外。
形式（JSON配列のみ。説明文不要）:
[{"name": "店名", "url": "https://...", "area": "エリア名"}]`;

  try {
    const raw = callLlm(prompt);

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
    console.warn(`  ⚠️  LLM検索エラー: ${err}`);
    return [];
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
  console.log(`🎷 NearJam 会場発見スクリプト（LLM: ${AVAILABLE_LLMS.join(', ') || 'なし'}）`);
  if (DRY_RUN) console.log('  [DRY RUN: DBへの書き込みなし]');
  if (NO_CRAWL) console.log('  [--no-crawl: URL登録のみ]');

  // 追加クエリをファイルから読み込む
  const extraQueries: string[] = [];
  if (EXTRA_QUERIES_FILE) {
    try {
      const raw = readFileSync(EXTRA_QUERIES_FILE, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const q of parsed) {
          if (typeof q === 'string' && q.trim()) extraQueries.push(q.trim());
        }
      }
      console.log(`  📎 追加クエリ: ${extraQueries.length}件 (${EXTRA_QUERIES_FILE})`);
    } catch (err) {
      console.warn(`  ⚠️  追加クエリファイル読み込み失敗: ${err}`);
    }
  }

  const allQueries = [...SEARCH_QUERIES, ...extraQueries];

  // Phase 1: LLM で会場URLを検索
  const allVenues: VenueItem[] = [];
  for (const query of allQueries) {
    if (consecutiveLlmFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(`  ⚠️  全LLMが${MAX_CONSECUTIVE_FAILURES}回連続で応答不能。残り${allQueries.length - allVenues.length}件をスキップします`);
      break;
    }
    console.log(`\n🔍 検索: "${query.slice(0, 40)}..."`);
    const found = searchVenuesWithLlm(query);
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
