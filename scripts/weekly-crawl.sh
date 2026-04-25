#!/bin/bash
# NearJam 週次クロール — LLM主導の自動改善ループ
#
# 実行タイミング: 毎週日曜 3:30（scheduler経由）
# 手動実行: bash scripts/weekly-crawl.sh
#
# フロー:
#   Phase 1: DB統計を収集（db-stats.ts）
#   Phase 2: LLM が前回の履歴を見て追加クエリを提案
#   Phase 3: discover.ts で全クエリを実行（URL収集 → DB登録）
#   Phase 4: crawl.ts ループ（pending_review が 0 になるまで）
#   Phase 5: --retry-low で低信頼度を再試行
#   Phase 6: 結果を履歴ファイルに保存（次回の学習素材）
#   Phase 7: Discord に週次レポートを投稿
#
# Note: DATABASE_URL は .env.local で本番Azure PostgreSQLを指すように設定済み。

set -euo pipefail

NEARJAM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$NEARJAM_DIR/scripts"
HISTORY_FILE="$SCRIPTS_DIR/crawl-history.json"
TMPDIR_LOCAL="$NEARJAM_DIR/.tmp"
mkdir -p "$TMPDIR_LOCAL"
export TMPDIR="$TMPDIR_LOCAL"
export DOTENV_CONFIG_PATH="$NEARJAM_DIR/.env.local"
EXTRA_QUERIES_FILE="$(mktemp "$TMPDIR_LOCAL/nearjam-extra-queries-XXXXXXXX.json")"
PROMPT_FILE="$(mktemp "$TMPDIR_LOCAL/nearjam-prompt-XXXXXXXX.txt")"
LOG_FILE="$(mktemp "$TMPDIR_LOCAL/nearjam-weekly-XXXXXXXX.log")"
TS_NODE_CMD="npx ts-node -r dotenv/config --compiler-options {\"module\":\"CommonJS\"}"

cd "$NEARJAM_DIR"

# PATH を確認（npm/node/claude/gemini/codex が使えるように）
export PATH="$HOME/.npm-global/bin:$HOME/.local/bin:$PATH"

log() { echo "$*" | tee -a "$LOG_FILE"; }
log_section() { log ""; log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; log "$*"; }

# LLMコマンドを選択（gemini -p > claude -p > codex -p の優先順位）
# gemini優先の理由: ウェブ検索機能が内蔵。claude -pはClaude Code内からネスト不可
select_llm_cmd() {
  if command -v gemini &>/dev/null; then
    # Geminiのクォータチェック（簡易: 実行してみてエラーなら次へ）
    local test_out
    test_out=$(timeout 30 gemini -p "test" 2>&1 || true)
    if echo "$test_out" | grep -qiE "QuotaError|exhausted|capacity|rate.limit|TerminalQuota"; then
      log "  ⚠️  gemini: クォータ切れ。次のLLMを試行..."
    else
      echo "gemini -p"
      return
    fi
  fi
  # claude -p は CLAUDECODE 環境変数がセットされていると使えない（ネスト禁止）
  if [ -z "${CLAUDECODE:-}" ] && command -v claude &>/dev/null; then
    echo "claude -p"
  elif command -v codex &>/dev/null; then
    echo "codex -p"
  else
    echo ""
  fi
}

LLM_CMD=$(select_llm_cmd)
if [ -z "$LLM_CMD" ]; then
  log "⚠️  LLM CLI が見つかりません（claude/gemini/codex）。Phase 2 をスキップします"
fi

log_section "🎷 NearJam 週次クロール開始: $(date '+%Y-%m-%d %H:%M:%S')"
log "  LLM: ${LLM_CMD:-なし}"

# ──────────────────────────────────────────────────────────────
# Phase 1: DB統計を収集（db-stats.ts を使用）
# ──────────────────────────────────────────────────────────────
log_section "📊 Phase 1: DB統計を収集中..."

DB_STATS=$($TS_NODE_CMD scripts/db-stats.ts --full 2>&1 | tee -a "$LOG_FILE" | tail -1)

# JSON として有効か検証
if ! python3 -c "import json; d=json.loads('$DB_STATS'); assert d.get('venues', 0) > 0 or d.get('pending', 0) >= 0" 2>/dev/null; then
  log "⚠️  DB統計の取得に失敗しました。出力: $DB_STATS"
  log "フォールバック: 直接 DATABASE_URL で接続を試みます..."
  # フォールバック: .env.local から DATABASE_URL を読んで直接クエリ
  DB_STATS=$($TS_NODE_CMD -e "
import * as dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { prisma } from './src/lib/prisma';
prisma.venue.count().then(n => console.log(JSON.stringify({venues: n, sessions: 0, success: 0, error: 0, low: 0, pending: 0})))
  .finally(() => prisma.\$disconnect());
" 2>&1 | grep '^{' | head -1 || echo '{"venues":-1,"sessions":-1,"error_msg":"DB接続失敗"}')
fi

log "DB統計: $DB_STATS"

# ──────────────────────────────────────────────────────────────
# Phase 2: LLM が前回の履歴を見て追加クエリを提案
# ──────────────────────────────────────────────────────────────
log_section "🤖 Phase 2: LLM に追加クエリを提案してもらう..."

HISTORY_CONTEXT="初回実行のため履歴なし"
if [ -f "$HISTORY_FILE" ]; then
  HISTORY_CONTEXT=$(python3 -c "
import json
with open('$HISTORY_FILE') as f:
    h = json.load(f)
for entry in h[-2:]:
    s = entry.get('success', 0)
    e = entry.get('error', 1)
    rate = round(s / max(s + e, 1) * 100)
    print(f\"  {entry.get('date','?')[:10]}: 会場{entry.get('venues','?')}件, セッション{entry.get('sessions','?')}件, 成功率{rate}%\")
    if entry.get('extra_queries'):
        print(f\"  前回の追加クエリ: {', '.join(entry['extra_queries'][:3])}...\")
" 2>&1 || echo "$HISTORY_CONTEXT")
fi

EXTRA_COUNT=0

if [ -n "$LLM_CMD" ]; then
  cat > "$PROMPT_FILE" << 'LLM_PROMPT_END'
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
LLM_PROMPT_END

  # プレースホルダーを実際の値に置換
  python3 -c "
import sys
text = open('$PROMPT_FILE').read()
text = text.replace('DB_STATS_PLACEHOLDER', '''$DB_STATS''')
text = text.replace('HISTORY_PLACEHOLDER', '''$HISTORY_CONTEXT''')
open('$PROMPT_FILE', 'w').write(text)
" 2>&1 | tee -a "$LOG_FILE" || true

  PROMPT_CONTENT=$(cat "$PROMPT_FILE")
  EXTRA_QUERIES_RAW=$($LLM_CMD "$PROMPT_CONTENT" 2>&1 || echo "[]")
  rm -f "$PROMPT_FILE"

  # JSON配列だけを抽出してファイルに保存
  python3 -c "
import re, json
text = '''$EXTRA_QUERIES_RAW'''
match = re.search(r'\[[\s\S]*?\]', text)
if match:
    try:
        arr = [q for q in json.loads(match.group()) if isinstance(q, str)]
        print(json.dumps(arr, ensure_ascii=False))
    except Exception as e:
        import sys
        print(f'JSON parse error: {e}', file=sys.stderr)
        print('[]')
else:
    print('[]')
" > "$EXTRA_QUERIES_FILE" 2>&1 | tee -a "$LOG_FILE"

  EXTRA_COUNT=$(python3 -c "import json; print(len(json.load(open('$EXTRA_QUERIES_FILE'))))" 2>/dev/null || echo "0")
  log "LLM提案クエリ: ${EXTRA_COUNT}件（$LLM_CMD）"
  if [ "$EXTRA_COUNT" -gt 0 ]; then
    python3 -c "
import json
for q in json.load(open('$EXTRA_QUERIES_FILE'))[:5]:
    print(f'  • {q}')
" 2>/dev/null | tee -a "$LOG_FILE" || true
  fi
else
  echo "[]" > "$EXTRA_QUERIES_FILE"
  log "LLM CLI が利用不可のため、追加クエリなしで続行"
fi

# ──────────────────────────────────────────────────────────────
# Phase 3: discover.ts で全クエリを実行（URL収集 → DB登録）
# ──────────────────────────────────────────────────────────────
log_section "🔍 Phase 3: 会場URL収集中（既存クエリ + LLM追加${EXTRA_COUNT}クエリ）..."

$TS_NODE_CMD scripts/discover.ts \
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
  PENDING=$($TS_NODE_CMD -e "
import * as dotenv from 'dotenv'; dotenv.config({ path: '.env.local' });
import { prisma } from './src/lib/prisma';
prisma.autoCollectionJob.count({ where: { lastStatus: 'pending_review' } })
  .then(n => { console.log(n); })
  .finally(() => prisma.\$disconnect());
" 2>&1 | grep -E '^[0-9]+$' | head -1 || echo "0")

  if [ "${PENDING:-0}" -le 0 ]; then
    log "✅ pending_review = 0 — クロール完了"
    break
  fi

  log "[ループ $((LOOP+1))/$MAX_LOOPS] pending=${PENDING}件 — クロール実行中..."
  $TS_NODE_CMD scripts/crawl.ts 2>&1 | tee -a "$LOG_FILE" || true
  LOOP=$((LOOP+1))
done

# ──────────────────────────────────────────────────────────────
# Phase 5: 低信頼度URLを再試行
# ──────────────────────────────────────────────────────────────
log_section "🔄 Phase 5: 低信頼度URL再試行（サイト更新で改善する可能性あり）..."

$TS_NODE_CMD scripts/crawl.ts --retry-low \
  2>&1 | tee -a "$LOG_FILE" || log "⚠️  retry-low でエラーが発生（処理を継続）"

# ──────────────────────────────────────────────────────────────
# Phase 5.3: typicalDayOfWeek バックフィル（曜日がnullのセッションを再抽出）
# ──────────────────────────────────────────────────────────────
log_section "📅 Phase 5.3: typicalDayOfWeek バックフィル..."

if [ -n "$LLM_CMD" ]; then
  $TS_NODE_CMD scripts/backfill-day-of-week.ts \
    2>&1 | tee -a "$LOG_FILE" || log "⚠️  backfill-day-of-week でエラーが発生（処理を継続）"
else
  log "LLM CLI が利用不可のため、バックフィルをスキップ"
fi

# ──────────────────────────────────────────────────────────────
# Phase 5.5: アーティスト/曲タグ付け（LLM で HP から抽出）
# ──────────────────────────────────────────────────────────────
log_section "🏷️ Phase 5.5: セッション傾向にアーティスト/曲をタグ付け..."

$TS_NODE_CMD scripts/tag-tendencies.ts --limit=30 \
  2>&1 | tee -a "$LOG_FILE" || log "⚠️  tag-tendencies でエラーが発生（処理を継続）"

# ──────────────────────────────────────────────────────────────
# Phase 5.6: HP未発見会場の公式HP検索（LLM Web検索）
# ──────────────────────────────────────────────────────────────
log_section "🔗 Phase 5.6: HP未登録会場の公式HP自動発見..."

if [ -n "$LLM_CMD" ]; then
  $TS_NODE_CMD scripts/discover-urls.ts \
    2>&1 | tee -a "$LOG_FILE" || log "⚠️  discover-urls でエラーが発生（処理を継続）"
else
  log "LLM CLI が利用不可のため、HP検索をスキップ"
fi

# ──────────────────────────────────────────────────────────────
# Phase 6: 最終統計を収集して履歴ファイルに保存（db-stats.ts を使用）
# ──────────────────────────────────────────────────────────────
log_section "💾 Phase 6: 実行結果を履歴ファイルに保存..."

FINAL_STATS=$($TS_NODE_CMD scripts/db-stats.ts 2>&1 | grep '^{' | head -1 || echo '{"venues":0,"sessions":0}')

log "最終統計: $FINAL_STATS"

# 履歴ファイルに追記（直近5回分を保持）
python3 << PYTHON_END
import json
from datetime import datetime, timezone

history_file = '$HISTORY_FILE'
try:
    with open(history_file) as f:
        history = json.load(f)
    if not isinstance(history, list):
        history = []
except Exception:
    history = []

try:
    final = json.loads('''$FINAL_STATS''')
except Exception:
    final = {}

try:
    extra_queries = json.load(open('$EXTRA_QUERIES_FILE'))
except Exception:
    extra_queries = []

entry = {
    **final,
    'date': datetime.now(timezone.utc).isoformat(),
    'extra_queries': extra_queries,
    'extra_count': len(extra_queries),
    'llm_used': '''$LLM_CMD''' or 'none',
}
history.append(entry)
history = history[-5:]  # 直近5回分だけ保持

with open(history_file, 'w') as f:
    json.dump(history, f, ensure_ascii=False, indent=2)

v = final.get('venues', '?')
s = final.get('sessions', '?')
ok = final.get('success', '?')
err = final.get('error', '?')
lo = final.get('low', '?')
print(f'履歴保存完了（計{len(history)}件）')
print(f'  会場: {v}件 / セッション: {s}件')
print(f'  成功: {ok} / エラー: {err} / 低信頼度: {lo}')
PYTHON_END

# ──────────────────────────────────────────────────────────────
# Phase 7: Discord に週次レポートを投稿
# ──────────────────────────────────────────────────────────────
log_section "📣 Phase 7: Discord に週次レポートを投稿..."

REPORT_MSG=$(python3 << PYTHON_END
import json
s = json.loads('''$FINAL_STATS''')
extra_count = $EXTRA_COUNT
llm = '''$LLM_CMD''' or 'なし'
msg = f"""**🎷 NearJam 週次クロール完了**

📊 **DB状況**
• 会場: {s.get('venues', '?')}件
• AUTO収集セッション: {s.get('sessions', '?')}件

🤖 **今週の収集**
• LLM提案の追加クエリ: {extra_count}件（{llm}）
• クロール成功: {s.get('success', '?')} / エラー: {s.get('error', '?')} / 低信頼度: {s.get('low', '?')}

次回は来週日曜 3:30 に自動実行します。"""
print(msg)
PYTHON_END
)

# Discord Bot API に投稿
curl -s -X POST "http://127.0.0.1:8099/api/notify" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "import json; print(json.dumps({'title': 'NearJam 週次クロール', 'message': '''$REPORT_MSG'''}))")" \
  2>&1 | tee -a "$LOG_FILE" && log "Discord通知完了" || log "⚠️  Discord通知失敗（ログは保存済み）"

log_section "✅ 週次クロール完了: $(date '+%Y-%m-%d %H:%M:%S')"

# ログファイルをNearJamのlogsディレクトリにコピー
LOGS_DIR="$NEARJAM_DIR/logs"
mkdir -p "$LOGS_DIR"
cp "$LOG_FILE" "$LOGS_DIR/weekly-crawl-$(date '+%Y%m%d').log"

# 一時ファイルのクリーンアップ
rm -f "$EXTRA_QUERIES_FILE" "$PROMPT_FILE" "$LOG_FILE"
