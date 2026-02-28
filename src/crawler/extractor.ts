import { execFileSync, spawnSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ExtractionResultSchema, type ExtractionResult } from './types';

const SYSTEM_PROMPT = `あなたは日本のジャムセッション情報収集の専門家です。
Webページの本文から、以下の情報を抽出してください。

## 抽出対象
1. **会場情報** (venue): 店名、住所、最寄り駅、歩行時間、ウェブサイト、SNSリンク
2. **定期セッション情報** (sessions): 定期的なジャムセッションのスケジュール、ジャンル、料金、レベル

## 重要なルール
- 存在しない情報は絶対に作らない（hallucination禁止）
- 不明な場合はそのフィールドを省略する
- 日時は "HH:MM" 形式（例: "19:00", "22:30"）
- 曜日は数値（0=日曜 1=月 2=火 3=水 4=木 5=金 6=土）
- confidence は情報の確かさ（0.0〜1.0）。セッション情報が明確なら0.8以上

## 出力形式
必ずこのJSONのみを返してください（マークダウンコードブロック不要）:
{
  "venue": { ... },
  "sessions": [ ... ],
  "confidence": 0.0〜1.0,
  "notes": "備考"
}`;

/**
 * Webページの本文テキストをGeminiに渡し、構造化データとして抽出する。
 * プロンプトをファイル経由でstdinに渡すことでシェルインジェクションを防ぐ。
 */
export async function extractFromMarkdown(
  markdown: string,
  sourceUrl: string,
  pageTitle: string,
): Promise<ExtractionResult> {
  const userPrompt = `ページURL: ${sourceUrl}
ページタイトル: ${pageTitle}

--- ページ本文 ---
${markdown}
--- 本文ここまで ---

上記のページから会場情報とジャムセッション情報を抽出してください。JSONのみ返してください。`;

  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

  // プロンプトをファイルに書いてstdinで渡す（シェルインジェクション防止）
  const promptFile = join(tmpdir(), `nearjam-crawl-${Date.now()}.txt`);
  try {
    writeFileSync(promptFile, fullPrompt, 'utf8');

    // bash -ic 経由で gemini を呼び出し、stdin からプロンプトを渡す
    const result = spawnSync(
      'bash',
      ['-ic', `gemini -m gemini-2.5-flash -p "$(cat "${promptFile}")" 2>/dev/null`],
      { timeout: 60_000, encoding: 'utf8' },
    );

    if (result.status !== 0 && !result.stdout) {
      throw new Error(`Gemini 呼び出し失敗: ${result.stderr?.slice(0, 300) ?? 'unknown'}`);
    }

    return parseGeminiOutput(result.stdout ?? '');
  } finally {
    try { unlinkSync(promptFile); } catch { /* ignore */ }
  }
}

/** Gemini の出力から JSON を抽出してバリデーションする */
function parseGeminiOutput(raw: string): ExtractionResult {
  // bash -ic の警告行（tput等）を除去してJSONの開始行を探す
  const lines = raw.split('\n');
  const jsonStartIdx = lines.findIndex(l => l.trimStart().startsWith('{'));

  let jsonText: string;
  if (jsonStartIdx !== -1) {
    // ブレースの対応をカウントして真の JSON 末尾を見つける
    const candidate = lines.slice(jsonStartIdx).join('\n');
    jsonText = extractBalancedJson(candidate) ?? candidate;
  } else {
    // コードブロックで包まれているケース
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (!match) {
      throw new Error(`JSONが見つかりません。出力:\n${raw.slice(0, 500)}`);
    }
    jsonText = match[1];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`JSON パース失敗:\n${jsonText.slice(0, 500)}`);
  }

  // 部分的に不正なフィールドは除去して安全にパース
  const safeResult = ExtractionResultSchema.safeParse(parsed);
  if (safeResult.success) {
    return safeResult.data;
  }

  // venue が不正な場合は venue を除外して再試行
  const withoutVenue = ExtractionResultSchema.safeParse({ ...(parsed as object), venue: undefined });
  if (withoutVenue.success) {
    return withoutVenue.data;
  }

  throw new Error(`Zod バリデーション失敗: ${safeResult.error.message.slice(0, 300)}`);
}

/**
 * 文字列の先頭にある {...} を、ブレースの対応を追ってトリミングして返す。
 * 末尾に余分なテキスト（```等）があっても正しく切り出せる。
 */
function extractBalancedJson(text: string): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(0, i + 1);
      }
    }
  }

  return null; // バランスが取れていない
}
