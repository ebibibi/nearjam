/**
 * NearJam Web クローラー CLI
 *
 * 使い方:
 *   # 単一URLをクロール（テスト用）
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/crawl.ts https://example-bar.jp/session
 *
 *   # AutoCollectionJob テーブルの未処理ジョブを一括処理
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/crawl.ts
 *
 *   # 信頼度スコアのしきい値を指定（デフォルト: 0.4）
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/crawl.ts --min-confidence 0.6 https://...
 */

// .env.local を読み込む（Next.js 規約に合わせて .env.local を優先）
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../src/lib/prisma';
import { fetchPageAsMarkdown } from '../src/crawler/fetcher';
import { extractFromMarkdown } from '../src/crawler/extractor';
import { saveExtractionResult } from '../src/crawler/saver';

// ── CLI 引数パース ────────────────────────────────────────────────

const args = process.argv.slice(2);

let targetUrl: string | null = null;
let minConfidence = 0.4;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--min-confidence' && args[i + 1]) {
    minConfidence = parseFloat(args[i + 1]);
    i++;
  } else if (args[i].startsWith('http')) {
    targetUrl = args[i];
  }
}

// ── メイン処理 ───────────────────────────────────────────────────

async function crawlUrl(url: string, jobId?: string): Promise<void> {
  console.log(`\n🌐 クロール開始: ${url}`);
  const startedAt = Date.now();

  try {
    // 1. ページ取得
    console.log('  📄 ページ取得中...');
    const { markdown, title, url: finalUrl } = await fetchPageAsMarkdown(url);
    console.log(`  タイトル: "${title}" (${markdown.length} 文字)`);

    // 2. Gemini で抽出
    console.log('  🤖 Gemini で情報抽出中...');
    const result = await extractFromMarkdown(markdown, finalUrl, title);
    console.log(`  信頼度: ${result.confidence.toFixed(2)}${result.notes ? ` / 備考: ${result.notes}` : ''}`);

    if (result.confidence < minConfidence) {
      const msg = `信頼度が低すぎるためスキップ (${result.confidence.toFixed(2)} < ${minConfidence})`;
      console.warn(`  ⚠️  ${msg}`);

      if (jobId) {
        await prisma.autoCollectionJob.update({
          where: { id: jobId },
          data: { lastStatus: 'low_confidence', errorMessage: msg, lastFetchedAt: new Date() },
        });
      }
      return;
    }

    // 3. DB 保存
    console.log('  💾 DB に保存中...');
    const { venueId, tendencyIds } = await saveExtractionResult(result, finalUrl, jobId);

    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`  ✅ 完了 (${elapsed}s): 会場=${venueId ?? 'なし'}, セッション=${tendencyIds.length}件`);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ エラー: ${message}`);

    if (jobId) {
      await prisma.autoCollectionJob.update({
        where: { id: jobId },
        data: {
          lastStatus: 'error',
          errorMessage: message.slice(0, 1000),
          lastFetchedAt: new Date(),
        },
      });
    }
  }
}

async function runSingleUrl(url: string): Promise<void> {
  console.log('🔍 単一URLモード（DBへの保存あり）');
  await crawlUrl(url);
}

async function runJobQueue(): Promise<void> {
  console.log('📋 ジョブキューモード: AutoCollectionJob を処理します');

  // nextFetchAt が過去か null のジョブを取得（pendingまたは未設定）
  const now = new Date();
  const jobs = await prisma.autoCollectionJob.findMany({
    where: {
      OR: [
        { nextFetchAt: null },
        { nextFetchAt: { lte: now } },
      ],
      NOT: { lastStatus: 'error' }, // エラーのものは手動対応
    },
    orderBy: { nextFetchAt: 'asc' },
    take: 20, // 1回の実行で最大20件
  });

  if (jobs.length === 0) {
    console.log('処理するジョブがありません。');
    return;
  }

  console.log(`${jobs.length} 件のジョブを処理します\n`);

  let succeeded = 0;
  let failed = 0;

  for (const job of jobs) {
    await crawlUrl(job.sourceUrl, job.id);

    // 次回フェッチを24時間後に設定
    const nextFetch = new Date(Date.now() + 24 * 60 * 60 * 1000);
    try {
      await prisma.autoCollectionJob.update({
        where: { id: job.id },
        data: { nextFetchAt: nextFetch },
      });
    } catch { /* ignore */ }

    const status = await prisma.autoCollectionJob.findUnique({
      where: { id: job.id },
      select: { lastStatus: true },
    });
    if (status?.lastStatus === 'success') succeeded++;
    else failed++;

    // 連続アクセスによるレート制限を避けるため少し待つ
    await sleep(2000);
  }

  console.log(`\n📊 処理結果: 成功=${succeeded}, 失敗=${failed} / 合計=${jobs.length}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── エントリポイント ─────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🎷 NearJam クローラー');
  console.log(`   信頼度しきい値: ${minConfidence}`);

  try {
    if (targetUrl) {
      await runSingleUrl(targetUrl);
    } else {
      await runJobQueue();
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('致命的なエラー:', err);
  process.exit(1);
});
