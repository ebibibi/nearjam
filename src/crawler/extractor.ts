import { spawnSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ExtractionResultSchema, type ExtractionResult } from './types';

/** 利用可能な LLM CLI を優先順位付きで検出する（spawnSync で安全に実行） */
function detectAvailableLlm(): string | null {
  const candidates = ['gemini', 'codex'];

  // Claude Code 内ではネスト不可なので除外
  if (!process.env.CLAUDECODE) {
    candidates.splice(1, 0, 'claude');
  }

  for (const cmd of candidates) {
    const result = spawnSync('bash', ['-ic', `which ${cmd}`], {
      encoding: 'utf8',
      timeout: 5_000,
    });
    if (result.status === 0 && result.stdout.trim()) {
      return cmd;
    }
  }
  return null;
}

function buildLlmCommand(llmCmd: string, promptFile: string): string {
  // promptFile は内部生成のtempファイルパスなのでインジェクションリスクなし
  return `${llmCmd} -p "$(cat "${promptFile}")"`;
}

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

## typicalDayOfWeek の抽出（最重要）
曜日情報は定期セッション生成に不可欠。以下のパターンを見つけたら必ず数値に変換すること:
- 「毎週木曜」「毎週木曜日開催」→ typicalDayOfWeek: 4
- 「毎週水曜日」「水曜ジャムセッション」→ typicalDayOfWeek: 3
- 「金曜日のジャムナイト」「毎週金曜」→ typicalDayOfWeek: 5
- 「第2・第4土曜日」→ typicalDayOfWeek: 6（定期開催として扱う）
- 「月2回日曜日」→ typicalDayOfWeek: 0
- セッション名に曜日が含まれる場合（例: "Wednesday Jazz Session"）→ 対応する数値
- 曜日が本当に書かれていない場合のみ省略する

## 出力形式
必ずこのJSONのみを返してください（マークダウンコードブロック不要）:

### 例（参考）
{
  "venue": {
    "name": "Jazz Bar サンプル",
    "address": "東京都新宿区西新宿1-2-3",
    "nearestStation": "新宿",
    "walkMinutes": 5,
    "websiteUrl": "https://example-jazzbar.jp"
  },
  "sessions": [
    {
      "name": "木曜ジャズセッション",
      "typicalDayOfWeek": 4,
      "typicalStartTime": "19:30",
      "typicalEndTime": "22:00",
      "genres": ["Jazz"],
      "levelRange": "初心者歓迎",
      "entrySystem": "チャージ1500円+1ドリンク"
    },
    {
      "name": "日曜ブルースジャム",
      "typicalDayOfWeek": 0,
      "typicalStartTime": "15:00",
      "typicalEndTime": "18:00",
      "genres": ["Blues"],
      "entrySystem": "無料（ドリンクオーダー制）"
    }
  ],
  "confidence": 0.85,
  "notes": "木曜は毎週、日曜は月2回開催"
}`;

/**
 * Webページの本文テキストをLLM CLIに渡し、構造化データとして抽出する。
 * gemini > claude > codex の優先順でフォールバックする。
 * プロンプトをファイル経由で渡すことでシェルインジェクションを防ぐ。
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

  const llmCmd = detectAvailableLlm();
  if (!llmCmd) {
    throw new Error('利用可能な LLM CLI が見つかりません (gemini/claude/codex)');
  }

  const promptFile = join(tmpdir(), `nearjam-crawl-${Date.now()}.txt`);
  try {
    writeFileSync(promptFile, fullPrompt, 'utf8');

    const command = buildLlmCommand(llmCmd, promptFile);
    console.log(`  LLM: ${llmCmd} を使用`);

    const result = spawnSync(
      'bash',
      ['-ic', command],
      { timeout: 90_000, encoding: 'utf8' },
    );

    if (result.status !== 0 && !result.stdout) {
      const stderr = result.stderr?.slice(0, 300) ?? 'unknown';
      throw new Error(`LLM (${llmCmd}) 呼び出し失敗: ${stderr}`);
    }

    if (result.stderr) {
      console.warn(`  LLM stderr: ${result.stderr.slice(0, 200)}`);
    }

    return parseLlmOutput(result.stdout ?? '');
  } finally {
    try { unlinkSync(promptFile); } catch { /* ignore */ }
  }
}

/** LLM CLI の出力から JSON を抽出してバリデーションする */
function parseLlmOutput(raw: string): ExtractionResult {
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
