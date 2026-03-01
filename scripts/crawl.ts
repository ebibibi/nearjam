/**
 * NearJam Web クローラー CLI
 *
 * 使い方:
 *   # 単一URLをクロール（サブページも自動追試）
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/crawl.ts https://example-bar.jp/
 *
 *   # AutoCollectionJob テーブルの未処理ジョブを一括処理
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/crawl.ts
 *
 *   # low_confidence を含めて再処理
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/crawl.ts --retry-low
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../src/lib/prisma';
import { fetchPageWithSessionLinks, fetchMultiplePages } from '../src/crawler/fetcher';
import { extractFromMarkdown } from '../src/crawler/extractor';
import { saveExtractionResult } from '../src/crawler/saver';

// ── CLI 引数 ────────────────────────────────────────────────────

const args = process.argv.slice(2);
let targetUrl: string | null = null;
let minConfidence = 0.4;
const retryLow = args.includes('--retry-low');

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--min-confidence' && args[i + 1]) {
    minConfidence = parseFloat(args[i + 1]);
    i++;
  } else if (args[i].startsWith('http')) {
    targetUrl = args[i];
  }
}

// ── コア: 1会場をフルクロール ─────────────────────────────────────

/**
 * 1つの会場URLをクロールする。
 * 1. メインページを取得してGeminiで抽出
 * 2. 信頼度が低い場合はセッション系サブページも追試
 * 3. 最も信頼度の高い結果をDBに保存
 */
async function crawlVenue(url: string, jobId?: string): Promise<void> {
  console.log(`\n🌐 ${url}`);
  const startedAt = Date.now();

  try {
    // --- Step 1: メインページ取得（セッション系リンクも同時取得）---
    process.stdout.write('  📄 メインページ取得中... ');
    const main = await fetchPageWithSessionLinks(url);
    console.log(`"${main.title}" (${main.markdown.length}文字)`);

    // --- Step 2: Gemini で抽出 ---
    process.stdout.write('  🤖 抽出中... ');
    let best = await extractFromMarkdown(main.markdown, main.url, main.title);
    let bestSource = main.url;
    console.log(`信頼度: ${best.confidence.toFixed(2)}`);

    // --- Step 3: 信頼度不足の場合サブページを試す ---
    if (best.confidence < minConfidence && main.sessionPageLinks.length > 0) {
      console.log(`  🔗 サブページ ${main.sessionPageLinks.length} 件を追試:`);
      main.sessionPageLinks.forEach(l => console.log(`     ${l}`));

      const subResults = await fetchMultiplePages(main.sessionPageLinks);

      for (const sub of subResults) {
        if (sub.markdown.length < 50) continue;
        process.stdout.write(`  🤖 ${sub.url.split('/').slice(-2).join('/')} 抽出中... `);
        const subResult = await extractFromMarkdown(sub.markdown, sub.url, sub.title);
        console.log(`信頼度: ${subResult.confidence.toFixed(2)}`);

        if (subResult.confidence > best.confidence) {
          best = subResult;
          bestSource = sub.url;
        }
        if (best.confidence >= minConfidence) break;
      }
    }

    // --- Step 4: 最終判定 ---
    if (best.confidence < minConfidence) {
      const msg = `信頼度不足 (${best.confidence.toFixed(2)} < ${minConfidence})`;
      console.log(`  ⚠️  ${msg}`);
      if (jobId) {
        await prisma.autoCollectionJob.update({
          where: { id: jobId },
          data: { lastStatus: 'low_confidence', errorMessage: msg, lastFetchedAt: new Date() },
        });
      }
      return;
    }

    if (bestSource !== main.url) {
      console.log(`  ✨ サブページで信頼度向上: ${bestSource}`);
    }

    // --- Step 5: DB保存 ---
    const { venueId, tendencyIds } = await saveExtractionResult(best, bestSource, jobId);
    const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`  ✅ ${elapsed}s — 会場=${venueId ? '保存' : 'なし'}, セッション=${tendencyIds.length}件`);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const brief = message.split('\n')[0].slice(0, 120);
    console.log(`  ❌ ${brief}`);
    if (jobId) {
      await prisma.autoCollectionJob.update({
        where: { id: jobId },
        data: { lastStatus: 'error', errorMessage: message.slice(0, 1000), lastFetchedAt: new Date() },
      });
    }
  }
}

// ── ジョブキュー処理 ─────────────────────────────────────────────

async function runJobQueue(): Promise<void> {
  const now = new Date();

  const whereClause = retryLow
    ? {
        OR: [
          { nextFetchAt: null },
          { nextFetchAt: { lte: now } },
          { lastStatus: 'low_confidence' },
        ],
        NOT: { lastStatus: 'error' },
      }
    : {
        OR: [
          { nextFetchAt: null },
          { nextFetchAt: { lte: now } },
        ],
        NOT: { lastStatus: 'error' },
      };

  const jobs = await prisma.autoCollectionJob.findMany({
    where: whereClause,
    orderBy: { nextFetchAt: 'asc' },
    take: 50,
  });

  if (jobs.length === 0) {
    console.log('処理するジョブがありません。');
    return;
  }

  console.log(`${jobs.length} 件のジョブを処理します`);
  let succeeded = 0, failed = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    process.stdout.write(`[${i + 1}/${jobs.length}] `);
    await crawlVenue(job.sourceUrl, job.id);

    const nextFetch = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.autoCollectionJob.update({
      where: { id: job.id },
      data: { nextFetchAt: nextFetch },
    }).catch(() => {});

    const status = await prisma.autoCollectionJob.findUnique({
      where: { id: job.id },
      select: { lastStatus: true },
    });
    if (status?.lastStatus === 'success') succeeded++;
    else failed++;

    await sleep(2500);
  }

  const [venueCount, sessionCount] = await Promise.all([
    prisma.venue.count(),
    prisma.sessionTendency.count({ where: { sourceType: 'AUTO_COLLECTED' } }),
  ]);

  console.log(`\n📊 完了: 成功=${succeeded}, 失敗=${failed} / 合計=${jobs.length}`);
  console.log(`   DB合計: 会場=${venueCount}件, セッション=${sessionCount}件`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── エントリポイント ─────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🎷 NearJam クローラー');
  console.log(`   信頼度しきい値: ${minConfidence}${retryLow ? '  [low_confidence再試行あり]' : ''}`);

  try {
    if (targetUrl) {
      await crawlVenue(targetUrl);
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
