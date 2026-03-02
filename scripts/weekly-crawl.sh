#!/bin/bash
# NearJam 週次クロール — LLM主導の自動改善ループ
#
# 実行タイミング: 毎週日曜 3:00（scheduler経由）
# 手動実行: bash scripts/weekly-crawl.sh
#
# フロー:
#   Phase 1: DB統計を収集
#   Phase 2: Gemini が前回の履歴を見て追加クエリを提案
#   Phase 3: discover.ts で全クエリを実行（URL収集 → DB登録）
#   Phase 4: crawl.ts ループ（pending_review が 0 になるまで）
#   Phase 5: --retry-low で低信頼度を再試行
#   Phase 6: 結果を履歴ファイルに保存（次回の学習素材）
#   Phase 7: Discord に週次レポートを投稿
#
# Note: DATABASE_URL は .env.local で本番Azure PostgreSQLを指すように設定済み。
#       スクリプトの dotenv.config('.env.local') で自動的に本番DBに書き込む。

set -euo pipefail

NEARJAM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$NEARJAM_DIR/scripts"
HISTORY_FILE="$SCRIPTS_DIR/crawl-history.json"
EXTRA_QUERIES_FILE="$(mktemp /tmp/nearjam-extra-queries-XXXXXXXX.json)"
PROMPT_FILE="$(mktemp /tmp/nearjam-prompt-XXXXXXXX.txt)"
LOG_FILE="$(mktemp /tmp/nearjam-weekly-XXXXXXXX.log)"
TS_NODE="npx ts-node --compiler-options '{\"module\":\"CommonJS\"}'"

cd "$NEARJAM_DIR"

# PATH を確認（npm/node が使えることを確認）
export PATH="$HOME/.npm-global/bin:$HOME/.local/bin:$PATH"

log() { echo "$*" | tee -a "$LOG_FILE"; }
log_section() { log ""; log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; log "$*"; }

log_section "🎷 NearJam 週次クロール開始: $(date '+%Y-%m-%d %H:%M:%S')"

# ──────────────────────────────────────────────────────────────
# Phase 1: DB統計を収集
# ──────────────────────────────────────────────────────────────
log_section "📊 Phase 1: DB統計を収集中..."

DB_STATS=$(npx ts-node --compiler-options '{"module":"CommonJS"}' -e "
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { prisma } from './src/lib/prisma';
async function main() {
  const [venues, sessions, success, error, low, pending] = await Promise.all([
    prisma.venue.count(),
    prisma.sessionTendency.count({ where: { sourceType: 'AUTO_COLLECTED' } }),
    prisma.autoCollectionJob.count({ where: { lastStatus: 'success' } }),
    prisma.autoCollectionJob.count({ where: { lastStatus: 'error' } }),
    prisma.autoCollectionJob.count({ where: { lastStatus: 'low_confidence' } }),
    prisma.autoCollectionJob.count({ where: { lastStatus: 'pending_review' } }),
  ]);

  // 都道府県別の会場分布（addressから推定）
  const venueList = await prisma.venue.findMany({ select: { address: true, area: true } });
  const areaCounts: Record<string, number> = {};
  for (const v of venueList) {
    const region = v.area ?? (v.address?.match(/^(東京|大阪|神奈川|愛知|福岡|北海道|京都|兵庫|埼玉|千葉|宮城|広島|静岡|熊本|鹿児島|沖縄)/) ?? ['その他'])[0];
    areaCounts[region] = (areaCounts[region] ?? 0) + 1;
  }

  // 登録済みURLリスト（重複クロール防止のため）
  const errorUrls = await prisma.autoCollectionJob.findMany({
    where: { lastStatus: 'error' },
    select: { sourceUrl: true, errorMessage: true },
    take: 20,
  });
  const errorPatterns = errorUrls.map(u => u.sourceUrl).join(', ');

  console.log(JSON.stringify({
    venues, sessions, success, error, low, pending, areaCounts, errorPatterns
  }));
}
main().finally(() => prisma.\$disconnect());
" 2>/dev/null || echo '{"venues":0,"sessions":0,"success":0,"error":0,"low":0,"pending":0,"areaCounts":{}}')

log "DB統計: $DB_STATS"

# ──────────────────────────────────────────────────────────────
# Phase 2: Gemini が前回の履歴を見て追加クエリを提案
# ──────────────────────────────────────────────────────────────
log_section "🤖 Phase 2: Gemini に追加クエリを提案してもらう..."

HISTORY_CONTEXT="初回実行のため履歴なし"
if [ -f "$HISTORY_FILE" ]; then
  HISTORY_CONTEXT=$(python3 -c "
import json
with open('$HISTORY_FILE') as f:
    h = json.load(f)
# 直近2回分だけ表示
for entry in h[-2:]:
    print(f\"  {entry.get('date','?')[:10]}: 会場{entry.get('venues','?')}件, セッション{entry.get('sessions','?')}件, 成功率{round(entry.get('success',0)/(entry.get('success',0)+entry.get('error',1))*100)}%\")
    if entry.get('extra_queries'):
        print(f\"  前回の追加クエリ: {', '.join(entry['extra_queries'][:3])}...\")
" 2>/dev/null || echo "$HISTORY_CONTEXT")
fi

cat > "$PROMPT_FILE" << 'GEMINI_PROMPT_END'
NearJam（日本全国のジャズ・ジャムセッションバー情報サービス）の週次クロールを行います。

【現在のDB状況】
DB_STATS_PLACEHOLDER

【前回までの実行履歴】
HISTORY_PLACEHOLDER

【毎週実行している既存の検索クエリ（例）】
- 渋谷・恵比寿・代官山 ジャズ ジャムセッション バー
- 大阪・梅田・心斎橋 ジャズ ジャムセッション バー
- 福岡・博多 ジャズ ジャムセッション バー
- 札幌・北海道 ジャズ ジャムセッション バー
- 那覇・沖縄 ジャズ セッション バー
（47都道府県をカバーする31クエリをすでに実行中）

【タスク】
以下の観点で、まだ試していない可能性がある追加の検索クエリを10件提案してください：
1. 政令市以外の中小都市（例：盛岡、米子、宇部、佐伯、石垣島 等）
2. ジャズ以外のセッション系キーワード（ブルース、フュージョン、ラテン、ボサノバ セッション）
3. ライブハウス・音楽スタジオ系（定期オープンセッションを開催している場所）
4. 大学・音楽系専門学校の周辺エリア（学生セッション文化が多い）
5. 観光地・リゾート地（熱海、箱根、軽井沢 等）のジャズバー

出力形式（JSON文字列配列のみ、日本語のみ、説明文一切不要）:
["クエリ1", "クエリ2", ..., "クエリ10"]
GEMINI_PROMPT_END

# プレースホルダーを実際の値に置換
sed -i "s|DB_STATS_PLACEHOLDER|$DB_STATS|g" "$PROMPT_FILE"
# HISTORYはシングルクォートで囲むとエスケープ不要だが変数展開できないので別の方法
python3 -c "
import sys
text = open('$PROMPT_FILE').read()
text = text.replace('HISTORY_PLACEHOLDER', '''$HISTORY_CONTEXT''')
open('$PROMPT_FILE', 'w').write(text)
" 2>/dev/null || true

EXTRA_QUERIES_RAW=$(bash -ic "gemini -m gemini-2.5-flash -p \"\$(cat '$PROMPT_FILE')\" 2>/dev/null" || echo "[]")
rm -f "$PROMPT_FILE"

# JSON配列だけを抽出してファイルに保存
python3 -c "
import sys, re, json
text = '''$EXTRA_QUERIES_RAW'''
match = re.search(r'\[[\s\S]*?\]', text)
if match:
    try:
        arr = [q for q in json.loads(match.group()) if isinstance(q, str)]
        print(json.dumps(arr, ensure_ascii=False))
    except Exception as e:
        sys.stderr.write(f'JSON parse error: {e}\n')
        print('[]')
else:
    print('[]')
" 2>/tmp/nearjam-gemini-err.txt > "$EXTRA_QUERIES_FILE"

EXTRA_COUNT=$(python3 -c "import json; print(len(json.load(open('$EXTRA_QUERIES_FILE'))))" 2>/dev/null || echo "0")
log "Gemini提案クエリ: ${EXTRA_COUNT}件"
if [ "$EXTRA_COUNT" -gt 0 ]; then
  python3 -c "
import json
for q in json.load(open('$EXTRA_QUERIES_FILE'))[:5]:
    print(f'  • {q}')
" 2>/dev/null || true | tee -a "$LOG_FILE"
fi

# ──────────────────────────────────────────────────────────────
# Phase 3: discover.ts で全クエリを実行（URL収集 → DB登録）
# ──────────────────────────────────────────────────────────────
log_section "🔍 Phase 3: 会場URL収集中（既存31クエリ + Gemini追加${EXTRA_COUNT}クエリ）..."

npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/discover.ts \
  --no-crawl \
  --extra-queries-file "$EXTRA_QUERIES_FILE" \
  2>&1 | tee -a "$LOG_FILE" || log "⚠️  discover.ts でエラーが発生（処理を継続）"

# ──────────────────────────────────────────────────────────────
# Phase 4: crawl.ts ループ（pending_review が 0 になるまで）
# ──────────────────────────────────────────────────────────────
log_section "🌐 Phase 4: クロール実行..."

MAX_LOOPS=15
LOOP=0
while [ "$LOOP" -lt "$MAX_LOOPS" ]; do
  PENDING=$(npx ts-node --compiler-options '{"module":"CommonJS"}' -e "
import * as dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { prisma } from './src/lib/prisma';
prisma.autoCollectionJob.count({ where: { lastStatus: 'pending_review' } })
  .then(n => { console.log(n); })
  .finally(() => prisma.\$disconnect());
" 2>/dev/null || echo "0")

  if [ "${PENDING:-0}" -le 0 ]; then
    log "✅ pending_review = 0 — クロール完了"
    break
  fi

  log "[ループ $((LOOP+1))/$MAX_LOOPS] pending=${PENDING}件 — クロール実行中..."
  npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/crawl.ts 2>&1 | tee -a "$LOG_FILE" || true
  LOOP=$((LOOP+1))
done

# ──────────────────────────────────────────────────────────────
# Phase 5: 低信頼度URLを再試行
# ──────────────────────────────────────────────────────────────
log_section "🔄 Phase 5: 低信頼度URL再試行（サイト更新で改善する可能性あり）..."

npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/crawl.ts --retry-low \
  2>&1 | tee -a "$LOG_FILE" || log "⚠️  retry-low でエラーが発生（処理を継続）"

# ──────────────────────────────────────────────────────────────
# Phase 6: 最終統計を収集して履歴ファイルに保存
# ──────────────────────────────────────────────────────────────
log_section "💾 Phase 6: 実行結果を履歴ファイルに保存..."

FINAL_STATS=$(npx ts-node --compiler-options '{"module":"CommonJS"}' -e "
import * as dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { prisma } from './src/lib/prisma';
async function main() {
  const [venues, sessions, success, error, low, pending] = await Promise.all([
    prisma.venue.count(),
    prisma.sessionTendency.count({ where: { sourceType: 'AUTO_COLLECTED' } }),
    prisma.autoCollectionJob.count({ where: { lastStatus: 'success' } }),
    prisma.autoCollectionJob.count({ where: { lastStatus: 'error' } }),
    prisma.autoCollectionJob.count({ where: { lastStatus: 'low_confidence' } }),
    prisma.autoCollectionJob.count({ where: { lastStatus: 'pending_review' } }),
  ]);
  console.log(JSON.stringify({ venues, sessions, success, error, low, pending }));
}
main().finally(() => prisma.\$disconnect());
" 2>/dev/null || echo '{"venues":0,"sessions":0}')

# 履歴ファイルに追記（直近5回分を保持）
python3 << PYTHON_END
import json, sys
from datetime import datetime, timezone

history_file = '$HISTORY_FILE'
try:
    with open(history_file) as f:
        history = json.load(f)
    if not isinstance(history, list):
        history = []
except:
    history = []

try:
    final = json.loads('''$FINAL_STATS''')
except:
    final = {}

extra_queries_raw = open('$EXTRA_QUERIES_FILE').read()
try:
    extra_queries = json.loads(extra_queries_raw)
except:
    extra_queries = []

entry = {
    **final,
    'date': datetime.now(timezone.utc).isoformat(),
    'extra_queries': extra_queries,
    'extra_count': len(extra_queries),
}
history.append(entry)
history = history[-5:]  # 直近5回分だけ保持

with open(history_file, 'w') as f:
    json.dump(history, f, ensure_ascii=False, indent=2)

print(f'履歴保存完了（計{len(history)}件）')
PYTHON_END
log "$(cat /dev/stdin <<< "$(python3 -c "
import json
s = json.loads('''$FINAL_STATS''')
print(f'  会場: {s.get(\"venues\",\"?\")}件 / セッション: {s.get(\"sessions\",\"?\")}件')
print(f'  成功: {s.get(\"success\",\"?\")} / エラー: {s.get(\"error\",\"?\")} / 低信頼度: {s.get(\"low\",\"?\")}')
" 2>/dev/null)")"

# ──────────────────────────────────────────────────────────────
# Phase 7: Discord に週次レポートを投稿
# ──────────────────────────────────────────────────────────────
log_section "📣 Phase 7: Discord に週次レポートを投稿..."

REPORT_MSG=$(python3 << PYTHON_END
import json
s = json.loads('''$FINAL_STATS''')
extra_count = $EXTRA_COUNT
msg = f"""**🎷 NearJam 週次クロール完了**

📊 **DB状況**
• 会場: {s.get('venues', '?')}件
• AUTO収集セッション: {s.get('sessions', '?')}件

🤖 **今週の収集**
• Gemini提案の追加クエリ: {extra_count}件
• クロール成功: {s.get('success', '?')} / エラー: {s.get('error', '?')} / 低信頼度: {s.get('low', '?')}

次回は来週日曜 3:00 に自動実行します。"""
print(msg)
PYTHON_END
)

# Discord Bot API に投稿
curl -s -X POST "http://127.0.0.1:8099/api/notify" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "import json; print(json.dumps({'title': 'NearJam 週次クロール', 'message': '''$REPORT_MSG'''}))")" \
  2>/dev/null && log "Discord通知完了" || log "⚠️  Discord通知失敗（ログは保存済み）"

log_section "✅ 週次クロール完了: $(date '+%Y-%m-%d %H:%M:%S')"

# ログファイルをNearJamのlogsディレクトリにコピー
LOGS_DIR="$NEARJAM_DIR/logs"
mkdir -p "$LOGS_DIR"
cp "$LOG_FILE" "$LOGS_DIR/weekly-crawl-$(date '+%Y%m%d').log"

# 一時ファイルのクリーンアップ
rm -f "$EXTRA_QUERIES_FILE" "$LOG_FILE"
