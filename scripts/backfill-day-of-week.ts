/**
 * 既存 SessionTendency の typicalDayOfWeek を埋めるバックフィルスクリプト。
 *
 * sourceUrl のページを取得し、LLM で曜日情報を抽出して DB を更新する。
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-day-of-week.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-day-of-week.ts --dry-run
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../src/lib/prisma';
import { execFileSync } from 'child_process';

const DRY_RUN = process.argv.includes('--dry-run');

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

async function fetchPageText(url: string, maxChars = 5000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NearJam-Bot/1.0 (session info collection)' },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, maxChars);
  } catch {
    return null;
  }
}

function callLLM(prompt: string): string {
  const envPath = `${process.env.HOME}/.npm-global/bin:${process.env.HOME}/.local/bin:${process.env.PATH}`;
  const { CLAUDECODE: _, ...cleanEnv } = process.env;
  const env = { ...cleanEnv, PATH: envPath };

  for (const cmd of ['gemini', 'claude', 'codex']) {
    try {
      execFileSync('which', [cmd], { stdio: 'ignore', env });
      const result = execFileSync(cmd, ['-p', prompt.substring(0, 6000)], {
        encoding: 'utf-8',
        timeout: 60000,
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

interface DayResult {
  sessions: Array<{
    name: string;
    typicalDayOfWeek: number | null;
    typicalStartTime?: string;
    typicalEndTime?: string;
  }>;
}

function parseResult(raw: string): DayResult {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { sessions: [] };
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.sessions)) return { sessions: [] };
    return {
      sessions: parsed.sessions
        .filter((s: Record<string, unknown>) =>
          typeof s.name === 'string' &&
          typeof s.typicalDayOfWeek === 'number' &&
          s.typicalDayOfWeek >= 0 && s.typicalDayOfWeek <= 6
        )
        .map((s: Record<string, unknown>) => ({
          name: s.name as string,
          typicalDayOfWeek: s.typicalDayOfWeek as number,
          typicalStartTime: typeof s.typicalStartTime === 'string' ? s.typicalStartTime : undefined,
          typicalEndTime: typeof s.typicalEndTime === 'string' ? s.typicalEndTime : undefined,
        })),
    };
  } catch {
    return { sessions: [] };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const tendencies = await prisma.sessionTendency.findMany({
    where: {
      isActive: true,
      sourceType: 'AUTO_COLLECTED',
      typicalDayOfWeek: null,
    },
    select: {
      id: true,
      name: true,
      sourceUrl: true,
      typicalStartTime: true,
      typicalEndTime: true,
      venue: { select: { name: true, websiteUrl: true } },
    },
  });

  console.log(`\n📅 typicalDayOfWeek が null の SessionTendency: ${tendencies.length} 件${DRY_RUN ? '（ドライラン）' : ''}\n`);

  if (tendencies.length === 0) {
    console.log('対象なし。');
    return;
  }

  const byUrl = new Map<string, typeof tendencies>();
  for (const t of tendencies) {
    const url = t.sourceUrl ?? t.venue.websiteUrl;
    if (!url) continue;
    const list = byUrl.get(url) ?? [];
    list.push(t);
    byUrl.set(url, list);
  }

  console.log(`  ${byUrl.size} 件のURLをクロールします\n`);

  let updated = 0;
  let failed = 0;
  let urlIdx = 0;

  for (const [url, records] of byUrl) {
    urlIdx++;
    console.log(`[${urlIdx}/${byUrl.size}] ${url}`);
    console.log(`  対象セッション: ${records.map(r => r.name).join(', ')}`);

    const pageText = await fetchPageText(url);
    if (!pageText || pageText.length < 30) {
      console.log(`  ⚠️ ページ取得失敗またはコンテンツ不足`);
      failed += records.length;
      continue;
    }

    const sessionList = records.map(r => `- "${r.name}" (会場: ${r.venue.name})`).join('\n');

    const prompt = `以下のWebページから、ジャムセッションの開催曜日を特定してください。

## ページ内容
${pageText.substring(0, 4000)}

## 対象セッション
${sessionList}

## 曜日の変換ルール
- 日曜=0, 月曜=1, 火曜=2, 水曜=3, 木曜=4, 金曜=5, 土曜=6
- 「毎週木曜」→ 4、「第2土曜」→ 6、「金曜ジャムナイト」→ 5
- ページ内に曜日情報が書かれていない場合のみ null

## 出力形式（JSONのみ、説明不要）
{
  "sessions": [
    {"name": "セッション名", "typicalDayOfWeek": 4, "typicalStartTime": "19:30", "typicalEndTime": "22:00"},
    {"name": "別のセッション", "typicalDayOfWeek": null}
  ]
}`;

    const raw = callLLM(prompt);
    const result = parseResult(raw);

    for (const record of records) {
      const match = result.sessions.find(s =>
        s.name === record.name || s.name.includes(record.name) || record.name.includes(s.name)
      );

      if (!match || match.typicalDayOfWeek === null) {
        console.log(`  ❌ "${record.name}" → 曜日抽出失敗`);
        failed++;
        continue;
      }

      const dayName = DAY_NAMES[match.typicalDayOfWeek];
      console.log(`  ✅ "${record.name}" → ${dayName}曜 (${match.typicalDayOfWeek})${match.typicalStartTime ? ` ${match.typicalStartTime}` : ''}`);

      if (!DRY_RUN) {
        const updateData: Record<string, unknown> = {
          typicalDayOfWeek: match.typicalDayOfWeek,
        };
        if (match.typicalStartTime && !record.typicalStartTime) {
          updateData.typicalStartTime = match.typicalStartTime;
        }
        if (match.typicalEndTime && !record.typicalEndTime) {
          updateData.typicalEndTime = match.typicalEndTime;
        }
        await prisma.sessionTendency.update({
          where: { id: record.id },
          data: updateData,
        });
        updated++;
      }
    }

    await sleep(2000);
  }

  console.log(`\n📊 結果: ${updated} 件更新 / ${failed} 件失敗 / ${tendencies.length} 件中\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
