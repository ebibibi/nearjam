/**
 * NearJam 会場URL発見スクリプト
 *
 * jazz.co.jp の一覧ページのテキストを解析して会場URLを抽出し、
 * AutoCollectionJob テーブルに登録したあと自動でクロールする。
 *
 * 使い方:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover.ts --dry-run
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover.ts --no-crawl
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { chromium } from '@playwright/test';
import { prisma } from '../src/lib/prisma';
import { fetchPageAsMarkdown } from '../src/crawler/fetcher';
import { extractFromMarkdown } from '../src/crawler/extractor';
import { saveExtractionResult } from '../src/crawler/saver';

// ── CLI 引数 ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const NO_CRAWL = args.includes('--no-crawl');

// ── 発見対象の一覧ページ ─────────────────────────────────────────
// jazz.co.jp のセッション一覧ページ（地域別）
const LISTING_PAGES = [
  'https://www.jazz.co.jp/LiveHouseSession/east/tokyo/index.html',
  'https://www.jazz.co.jp/LiveHouseSession/east/kanagawa/index.html',
  'https://www.jazz.co.jp/LiveHouseSession/east/saitama/index.html',
  'https://www.jazz.co.jp/LiveHouseSession/east/chiba/index.html',
  'https://www.jazz.co.jp/LiveHouseSession/west/osaka/index.html',
  'https://www.jazz.co.jp/LiveHouseSession/west/kyoto/index.html',
  'https://www.jazz.co.jp/LiveHouseSession/west/hyogo/index.html',
  'https://www.jazz.co.jp/LiveHouseSession/east/aichi/index.html',
];

// 除外するドメイン（SNS・予約サービス等）
const EXCLUDED_DOMAINS = [
  'twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'youtube.com',
  'ameblo.jp', 'r.goope.jp', 'tablecheck.com', 'tabelogwin.com',
  'tabelog.com', 'hotpepper.jp', 'gurunavi.com', 'retty.me',
  'yelp.com', 'google.com', 'apple.com', 'maps.google',
];

// ── テキストからURLを正規表現で抽出 ─────────────────────────────

interface DiscoveredVenue {
  name: string;
  url: string;
  sourceListingUrl: string;
}

/**
 * jazz.co.jp の一覧ページを取得し「URL ：xxx」パターンからURL群を抽出する。
 * 会場名はURL直前の行から取得する。
 */
async function discoverFromListingPage(listingUrl: string): Promise<DiscoveredVenue[]> {
  console.log(`\n🔍 スキャン: ${listingUrl}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; NearJamBot/1.0)',
      locale: 'ja-JP',
    });
    const page = await context.newPage();
    await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    const text = await page.evaluate(() => document.body.innerText ?? '');
    const lines = text.split('\n');
    const discovered: DiscoveredVenue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 「URL ：xxx」 または 「URL: xxx」のパターンにマッチ
      const urlMatch = line.match(/^URL\s*[：:]\s*(.+)$/);
      if (!urlMatch) continue;

      let rawUrl = urlMatch[1].trim();
      if (!rawUrl) continue;

      // プロトコルが省略されている場合は https:// を付加
      if (!rawUrl.startsWith('http')) {
        rawUrl = 'https://' + rawUrl;
      }

      // URL として有効か確認
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(rawUrl);
      } catch {
        continue;
      }

      // 除外ドメインチェック
      const hostname = parsedUrl.hostname.toLowerCase();
      if (EXCLUDED_DOMAINS.some(d => hostname.includes(d))) continue;
      // lit.link や linktr.ee などのリンクアグリゲーターは会場サイトではないが有用なので残す

      // 会場名: URL行より前を遡って探す
      // - メタデータ行（URL/Tel/交通/定休/料金/演奏）を除外
      // - 住所っぽい行（都道府県区市町番丁を含む）を除外
      // - 短い・長すぎるものを除外
      let venueName = hostname; // フォールバック
      for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
        const prev = lines[j].trim();
        if (!prev) continue;
        if (/^(URL|Tel|交通|定休|料金|演奏|Jam)/.test(prev)) continue;
        // 住所パターン（都道府県名 or 数字-数字-数字 のような区画番号が含まれる行）
        if (/[都府道県区市町村].*[0-9０-９]/.test(prev)) continue;
        if (/^[0-9０-９〒]/.test(prev)) continue;
        if (prev.length < 2 || prev.length > 60) continue;
        venueName = prev;
        break;
      }

      discovered.push({ name: venueName, url: rawUrl, sourceListingUrl: listingUrl });
    }

    console.log(`  ${discovered.length} 件の会場URLを抽出`);
    discovered.forEach(v => console.log(`    - ${v.name}: ${v.url}`));
    return discovered;
  } finally {
    await browser.close();
  }
}

// ── AutoCollectionJob への登録 ─────────────────────────────────

async function registerJobs(venues: DiscoveredVenue[]): Promise<Array<{ id: string; url: string }>> {
  const newJobs: Array<{ id: string; url: string }> = [];

  for (const v of venues) {
    const existing = await prisma.autoCollectionJob.findFirst({
      where: { sourceUrl: v.url },
    });
    if (existing) {
      console.log(`  スキップ（登録済み）: ${v.name}`);
      continue;
    }

    const job = await prisma.autoCollectionJob.create({
      data: { sourceType: 'hp', sourceUrl: v.url, lastStatus: 'pending_review' },
    });
    newJobs.push({ id: job.id, url: v.url });
    console.log(`  ✅ 登録: ${v.name} → ${v.url}`);
  }

  return newJobs;
}

// ── クロール実行 ─────────────────────────────────────────────────

async function crawlUrl(url: string, jobId: string): Promise<void> {
  try {
    const { markdown, title, url: finalUrl } = await fetchPageAsMarkdown(url);

    if (markdown.length < 50) {
      await prisma.autoCollectionJob.update({
        where: { id: jobId },
        data: { lastStatus: 'low_confidence', lastFetchedAt: new Date() },
      });
      console.log(`  スキップ（コンテンツ不足: ${markdown.length}文字）`);
      return;
    }

    const result = await extractFromMarkdown(markdown, finalUrl, title);

    if (result.confidence < 0.4) {
      await prisma.autoCollectionJob.update({
        where: { id: jobId },
        data: { lastStatus: 'low_confidence', lastFetchedAt: new Date() },
      });
      console.log(`  スキップ（信頼度低: ${result.confidence.toFixed(2)}）`);
      return;
    }

    const { venueId, tendencyIds } = await saveExtractionResult(result, finalUrl, jobId);
    console.log(`  ✅ 保存: 会場=${venueId ?? 'なし'}, セッション=${tendencyIds.length}件`);
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 200) : String(err);
    console.error(`  ❌ エラー: ${msg}`);
    await prisma.autoCollectionJob.update({
      where: { id: jobId },
      data: { lastStatus: 'error', errorMessage: msg, lastFetchedAt: new Date() },
    }).catch(() => { /* ignore */ });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── メイン ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🎷 NearJam 会場発見スクリプト（jazz.co.jp テキスト解析版）');
  if (DRY_RUN) console.log('  [DRY RUN: DBへの書き込みなし]');
  if (NO_CRAWL) console.log('  [--no-crawl: URL登録のみ]');

  // Phase 1: 各一覧ページから会場URLを抽出
  const allDiscovered: DiscoveredVenue[] = [];
  for (const listingUrl of LISTING_PAGES) {
    try {
      const found = await discoverFromListingPage(listingUrl);
      allDiscovered.push(...found);
    } catch (err) {
      console.error(`  ⚠️ スキャン失敗 (${listingUrl}): ${err}`);
    }
    await sleep(1500);
  }

  // 重複除去（URL正規化）
  const unique = Array.from(
    new Map(allDiscovered.map(v => {
      const u = new URL(v.url);
      const normalized = u.origin + u.pathname.replace(/\/$/, '');
      return [normalized, v];
    })).values(),
  );

  console.log(`\n📋 重複除去後: ${unique.length} 件の会場URLを発見`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] 登録予定URL:');
    unique.forEach((v, i) => console.log(`  ${i + 1}. ${v.name} | ${v.url}`));
    return;
  }

  // Phase 2: DB登録
  console.log('\n💾 AutoCollectionJob に登録中...');
  const newJobs = await registerJobs(unique);
  console.log(`\n${newJobs.length} 件の新規ジョブを登録`);

  if (NO_CRAWL || newJobs.length === 0) {
    console.log('クロールをスキップします。npm run crawl で後から実行できます。');
    return;
  }

  // Phase 3: 登録した会場を順次クロール
  console.log('\n🌐 クロール開始...');
  let done = 0;
  for (const job of newJobs) {
    process.stdout.write(`\n[${++done}/${newJobs.length}] ${job.url}\n`);
    await crawlUrl(job.url, job.id);
    await sleep(3000); // レート制限対策（3秒間隔）
  }

  // 最終集計
  const [venueCount, sessionCount] = await Promise.all([
    prisma.venue.count(),
    prisma.sessionTendency.count({ where: { sourceType: 'AUTO_COLLECTED' } }),
  ]);

  console.log(`\n✨ 完了！`);
  console.log(`   DB: 会場=${venueCount}件, クローラー収集セッション=${sessionCount}件`);
  console.log(`   今回の新規取込: ${newJobs.length}件 → クロール結果は上記ログを確認`);
}

main()
  .catch(err => { console.error('致命的なエラー:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
