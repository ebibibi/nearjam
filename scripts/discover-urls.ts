/**
 * HP未登録会場の公式HP自動発見スクリプト
 *
 * websiteUrl が null の会場に対して、LLM (gemini -p) のWeb検索機能で公式HPを発見し、
 * DBの websiteUrl を更新する。
 *
 * Gemini優先の理由: Web検索機能が内蔵されており、会場名+エリアで直接検索できる。
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover-urls.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover-urls.ts --dry-run
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover-urls.ts --limit 10
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { prisma } from '../src/lib/prisma';
import { execFileSync } from 'child_process';

const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.find((a) => a.startsWith('--limit'));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] || '20', 10) : 20;

function callLLM(prompt: string): string {
  const envPath = `${process.env.HOME}/.npm-global/bin:${process.env.HOME}/.local/bin:${process.env.PATH}`;
  // Remove CLAUDECODE to allow claude -p nesting from scheduler
  const { CLAUDECODE: _, ...cleanEnv } = process.env;
  const env = { ...cleanEnv, PATH: envPath };

  // Claude preferred: better at structured search results
  const cmds = ['claude', 'gemini', 'codex'];
  for (const cmd of cmds) {
    try {
      execFileSync('which', [cmd], { stdio: 'ignore', env });
      const result = execFileSync(cmd, ['-p', prompt.substring(0, 4000)], {
        encoding: 'utf-8',
        timeout: 30000,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return result.trim();
    } catch {
      continue;
    }
  }
  return '{}';
}

interface UrlResult {
  url: string | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
}

function parseUrlResult(raw: string): UrlResult {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { url: null, confidence: 'none' };
    const parsed = JSON.parse(match[0]);
    const url = typeof parsed.url === 'string' && parsed.url.startsWith('http') ? parsed.url : null;
    const confidence = ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'none';
    return { url, confidence: confidence as UrlResult['confidence'] };
  } catch {
    return { url: null, confidence: 'none' };
  }
}

async function main() {
  const venues = await prisma.venue.findMany({
    where: { websiteUrl: null },
    select: { id: true, name: true, nearestStation: true, address: true },
    take: LIMIT,
    orderBy: { name: 'asc' },
  });

  console.log(`\n🔗 ${venues.length} 件のHP未登録会場を検索します${DRY_RUN ? '（ドライラン）' : ''}\n`);

  let found = 0;
  let skipped = 0;

  for (const venue of venues) {
    const location = venue.nearestStation || venue.address || '';
    const prompt = `日本のジャズ・セッションバー「${venue.name}」${location ? `（${location}付近）` : ''}の公式ホームページURLを教えてください。

ウェブ検索して、以下の情報を返してください:
- 公式ホームページ、食べログ・ぐるなび等のポータルではなく店舗自身のサイト
- SNS（Instagram, X/Twitter, Facebook）のみの場合はそのURLでもOK
- 見つからない場合は null

JSON形式で出力:
{"url": "https://example.com", "confidence": "high"}

confidence:
- "high": 公式サイトが明確に特定できた
- "medium": おそらく正しいが確認が必要
- "low": 関連するが確証なし
- "none": 見つからない

{"url": null, "confidence": "none"} の場合もそのまま出力。`;

    console.log(`  検索中: ${venue.name}${location ? ` (${location})` : ''}`);
    const raw = callLLM(prompt);
    const result = parseUrlResult(raw);

    if (!result.url || result.confidence === 'none') {
      console.log(`    → 見つからず`);
      skipped++;
      continue;
    }

    // Validate URL by trying to fetch it
    let reachable = false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(result.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'NearJam-Bot/1.0' },
        redirect: 'follow',
      });
      clearTimeout(timeout);
      reachable = res.ok || res.status === 403; // 403 can happen with WAF but site exists
    } catch {
      reachable = false;
    }

    if (!reachable) {
      console.log(`    → ${result.url} (${result.confidence}) — 到達不能、スキップ`);
      skipped++;
      continue;
    }

    console.log(`    → ${result.url} (${result.confidence}) ✅`);

    if (!DRY_RUN && (result.confidence === 'high' || result.confidence === 'medium')) {
      await prisma.venue.update({
        where: { id: venue.id },
        data: { websiteUrl: result.url },
      });
      found++;
    }
  }

  console.log(`\n✅ 完了: ${found} 件更新 / ${skipped} 件スキップ\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
