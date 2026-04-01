/**
 * 既存の SessionTendency に typicalArtists / typicalSongs をタグ付けする。
 *
 * データソース:
 *   1. tendency名（例: "スギヤマ響 Funk Jazz Blues 参加型Session"）
 *   2. genres フィールド
 *   3. atmosphere フィールド
 *   4. 会場HPの内容（sourceUrl がある場合）
 *
 * LLM (gemini -p) で抽出し、DBを更新する。
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/tag-tendencies.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/tag-tendencies.ts --dry-run
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { prisma } from '../src/lib/prisma';
import { execFileSync } from 'child_process';

const DRY_RUN = process.argv.includes('--dry-run');

/** Fetch a URL and return text content (stripped of HTML tags), truncated */
async function fetchPageText(url: string, maxChars = 3000): Promise<string | null> {
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
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.substring(0, maxChars);
  } catch {
    return null;
  }
}

/** Call LLM to extract artists and songs — write prompt to temp file to avoid arg/stdin issues */
function callLLM(prompt: string): string {
  const fs = require('fs');
  const path = require('path');
  const tmpDir = path.join(process.cwd(), '.tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFile = path.join(tmpDir, `prompt-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, prompt);

  const envPath = `${process.env.HOME}/.npm-global/bin:${process.env.HOME}/.local/bin:${process.env.PATH}`;
  // Remove CLAUDECODE to allow claude -p nesting from scheduler
  const { CLAUDECODE: _, ...cleanEnv } = process.env;
  const env = { ...cleanEnv, PATH: envPath };
  const cmds = ['claude', 'gemini', 'codex'];
  try {
    for (const cmd of cmds) {
      try {
        execFileSync('which', [cmd], { stdio: 'ignore', env });
        // Read file content and pass as -p argument (gemini/claude/codex all accept -p "text")
        const result = execFileSync(cmd, ['-p', prompt.substring(0, 4000)], {
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
    return '{"artists":[],"songs":[]}';
  } finally {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

interface ExtractionResult {
  artists: string[];
  songs: string[];
}

function parseResult(raw: string): ExtractionResult {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return { artists: [], songs: [] };
    const parsed = JSON.parse(match[0]);
    return {
      artists: Array.isArray(parsed.artists) ? parsed.artists.filter((a: unknown) => typeof a === 'string') : [],
      songs: Array.isArray(parsed.songs) ? parsed.songs.filter((s: unknown) => typeof s === 'string') : [],
    };
  } catch {
    return { artists: [], songs: [] };
  }
}

async function main() {
  const tendencies = await prisma.sessionTendency.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      genres: true,
      atmosphere: true,
      sourceUrl: true,
      typicalArtists: true,
      typicalSongs: true,
      venue: { select: { name: true, websiteUrl: true } },
    },
  });

  console.log(`\n🎵 ${tendencies.length} 件の SessionTendency をタグ付けします${DRY_RUN ? '（ドライラン）' : ''}\n`);

  let updated = 0;
  let skipped = 0;

  for (const t of tendencies) {
    if (t.typicalArtists.length > 0 || t.typicalSongs.length > 0) {
      skipped++;
      continue;
    }

    const url = t.sourceUrl || t.venue.websiteUrl;
    let pageText = '';
    if (url) {
      const text = await fetchPageText(url);
      if (text) pageText = text;
    }

    const prompt = `以下のジャムセッション情報から、よく演奏されるアーティスト名と曲名を抽出してください。
確実にわかるものだけ。推測しすぎない。

セッション名: ${t.name}
会場名: ${t.venue.name}
ジャンル: ${t.genres.join(', ') || '不明'}
雰囲気: ${t.atmosphere || '不明'}
${pageText ? `会場HP内容（抜粋）:\n${pageText.substring(0, 2000)}` : ''}

JSON形式で出力（日本語アーティストは日本語、英語は英語で）:
{"artists": ["アーティスト名", ...], "songs": ["曲名", ...]}

何も見つからない場合は空配列で: {"artists": [], "songs": []}`;

    console.log(`  処理中: ${t.name} (${t.venue.name})${url ? ` [${url}]` : ''}`);
    const raw = callLLM(prompt);
    const result = parseResult(raw);

    if (result.artists.length === 0 && result.songs.length === 0) {
      console.log(`    → 抽出なし`);
      continue;
    }

    console.log(`    → artists: [${result.artists.join(', ')}]`);
    console.log(`    → songs: [${result.songs.join(', ')}]`);

    if (!DRY_RUN) {
      await prisma.sessionTendency.update({
        where: { id: t.id },
        data: {
          typicalArtists: result.artists,
          typicalSongs: result.songs,
        },
      });
      updated++;
    }
  }

  console.log(`\n✅ 完了: ${updated} 件更新 / ${skipped} 件スキップ（タグ付け済み）\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
