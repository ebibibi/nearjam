# NearJam 実装 Todo（PRD v0.4 差分）

> 生成日: 2026-03-01（Sprint 8-12 追加・全残機能完走計画）
> PRD との差異分析から抽出。Phase 1-3 の全自律実装可能機能を Sprint 単位で管理する。

---

## Sprint 3 — UX ポリッシュ（比較的簡単）

| ID  | ステータス | 機能 | 詳細 |
|-----|-----------|------|------|
| D1  | [x] | セッション編集ページ | 管理者が作成済みセッションのタイトル・日時・説明等を編集できるページ。`PUT /api/v1/sessions/[id]` + `/sessions/[id]/edit` ページ |
| D2  | [x] | プロフィール bio テキスト | `MusicianProfile.bio` フィールドは DB 済み。セットアップウィザード Step1 に追加、プロフィール表示ページに表示（実装済みと確認） |
| D3  | [x] | Accept-Language 自動判定 | PRD §2.8。next-intl createMiddleware のデフォルトで `localeDetection: true`（実装済みと確認） |
| D4  | [x] | 「道順を見る」ボタン | 会場・スタジオ詳細ページに Google Maps ルート案内リンクを追加。`/maps/dir/?api=1&destination=` 形式に修正済み |

---

## Sprint 4 — ディスカバリ強化

| ID  | ステータス | 機能 | 詳細 |
|-----|-----------|------|------|
| E1  | [x] | 会場の「よく演奏される曲 Top10」 | `PerformanceLog` を `songId` で集計し、会場詳細ページに表示。`prisma.performanceLog.groupBy` で実装済み |
| E2  | [x] | Tendency の「確認/古い」アクション | 会場オーナーが session tendency を "confirmed" / "outdated" にマークできる UI。`PATCH /api/v1/venues/[id]/tendencies/[tendencyId]` + `TendencyOwnerActions.tsx` |
| E3  | [x] | 演奏ログの公開範囲 UI | `PerformanceLog.visParticipation` / `visInstrument` / `visSongPerformance` / `visCoPerformers` の設定 UI を演奏履歴ページに追加 |

---

## Sprint 5 — ソーシャル・通知（複雑）

| ID  | ステータス | 機能 | 詳細 |
|-----|-----------|------|------|
| F1  | [x] | ミュージシャン間コネクション | 相互承認フォロー。`Connection` モデル（from/to/status: PENDING/ACCEPTED）+ フォローリクエスト UI + 承認 UI |
| F2  | [x] | 管理者権限委譲 | セッション管理者が別ミュージシャンに admin 権限を移譲できる。`SessionAdminPanel` に委譲 UI 追加済み |
| F3  | [x] | マッチング通知（Notification レコード作成） | ウィッシュリスト × セッション曲かぶり検知 → `Notification` レコード生成。セッション作成時に fire-and-forget で呼び出し |
| F4  | [x] | メール送信基盤（ACS Email + Managed Identity） | `src/lib/email.ts` + `src/lib/send-notifications.ts` + cron エンドポイント。接続文字列ゼロ |

---

## Sprint 6 — PRD v0.4 再照合ギャップ修正

| ID  | ステータス | 機能 | 詳細 |
|-----|-----------|------|------|
| G1  | [x] | セッション完了ボタン | `LiveSessionDashboard` に追加。確認ダイアログ → `POST /api/v1/sessions/[id]/complete` |
| G2  | [x] | ブロック機能 API + UI | `POST/DELETE /api/v1/users/[id]/block` + `BlockButton.tsx` + コネクションページに表示 |
| G3  | [x] | 楽器マッチング通知 | `createInstrumentMatchNotifications()` をセッション作成 fire-and-forget で呼び出し |
| G4  | [x] | ミュージシャン公開プロフィールページ | `/musicians/[id]` 実装。visibility gating + `ConnectionRequestButton` |
| G5  | [x] | Connection 30日クールダウン | `REJECTED` ステータス + `cooldownUntil` フィールド追加。マイグレーション済み |

---

## Sprint 7 — Phase 2 先行実装（Kudos・フィードバック・プライバシー・レコメンデーション・会場認証）

| ID  | ステータス | 機能 | 詳細 |
|-----|-----------|------|------|
| H1  | [x] | Kudos API + 受信箱 UI | `POST/GET /api/v1/sessions/[id]/kudos` + `GET /api/v1/kudos` + `/kudos` ページ + `KudosForm.tsx` |
| H2  | [x] | 匿名フィードバック | `POST /api/v1/sessions/[id]/feedback` + `GET /api/v1/feedback` |
| H3  | [x] | AND-consent プライバシー設定 UI | `GET/PUT /api/v1/sessions/[id]/privacy` + `PrivacySettingsPanel.tsx` |
| H4  | [x] | 会場認証（HP メール + MANUAL） | `claim/route.ts` + `verify/route.ts` + `verify/confirm/route.ts` + `VenueClaimButton.tsx` |
| H5  | [x] | 「近くで演奏されたが未ウィッシュリスト」レコメンデーション | `GET /api/v1/recommendations` + `/recommendations` ページ |
| H6  | [x] | Admin 収集キューレビュー | `GET/POST /api/v1/admin/collection-queue` + PATCH 承認/却下 + `/admin/collection-queue` ページ |

---

## Sprint 8 — Phase 1 完結（定期セッション・マナーページ・レコメンデーション2種目・なりすまし報告）

| ID  | ステータス | 機能 | 詳細 |
|-----|-----------|------|------|
| I1  | [x] | 定期セッション管理 | `SessionSeries` モデル + rrule-based 繰り返しルール。API `POST/GET /api/v1/session-series` + インスタンス生成エンドポイント + 作成 UI |
| I2  | [x] | マナーページ Markdown エディタ | `Venue.rulesMarkdown` は DB 済み。`PUT /api/v1/venues/[id]/rules` + Markdown エディタ UI（verified venue のみ） |
| I3  | [x] | 「練習して挑める曲」レコメンデーション | スキルレベル範囲内 + 未演奏 + エリアで人気の曲を提案。`/api/v1/recommendations?type=practice` |
| I4  | [x] | 会場なりすまし報告 | `VenueImpersonationReport` モデル + `POST /api/v1/venues/[id]/report` + 報告 UI |

---

## Sprint 9 — Phase 2 ソーシャル・AI マッチング

| ID  | ステータス | 機能 | 詳細 |
|-----|-----------|------|------|
| J1  | [x] | ターン/ソロ管理 UI | LiveSession ダッシュボードに「各参加者の演奏回数」可視化。`PerformanceLog.groupBy(musicianProfileId)` |
| J2  | [x] | 組み合わせマッチング提案 | 「この 3 人は共通曲 5 曲あるのに一緒にやってない」。SQL combinatorics で LLM なし実装。`GET /api/v1/match-suggestions` |
| J3  | [x] | ホスト主導マッチング | ホストが「利用可能日 + 弾ける曲」を登録 → マッチしたミュージシャンに通知。`HostAvailability` モデル + マッチング API |

---

## Sprint 10 — Phase 2 アナリティクス

| ID  | ステータス | 機能 | 詳細 |
|-----|-----------|------|------|
| K1  | [x] | ミュージシャン演奏履歴ページ（opt-in 公開） | `/musicians/[id]/history` — 過去セッション・曲・共演者を視覚化。`profileVisibility` を尊重 |
| K2  | [x] | 会場別セッション履歴・人気曲ページ | `/venues/[id]/analytics` — 開催回数・参加者数推移・人気曲 Top10 |
| K3  | [x] | 月次ダイジェスト（recurring sessions） | `SessionSeries` の実績を毎月集計して管理者にメール送信。cron エンドポイント追加 |

---

## Sprint 11 — Phase 2 自動収集 + Google Maps 拡張

| ID  | ステータス | 機能 | 詳細 |
|-----|-----------|------|------|
| L1  | [x] | 自動収集ボット定期再取得スケジューラー | `AutoCollectionJob.nextFetchAt` を参照して週次再取得。cron `POST /api/v1/cron/auto-collect` + scheduler 登録 |
| L2  | [x] | Google Maps フィルタ機能 | ジャンル・曜日・SYNCROOM・初心者向けフィルタ。`/map` ページの検索パネルを拡張 |
| L3  | [x] | 「今週近くで開催」マップビュー | 今週の JamSession を地図上にピン表示。`/map?week=true` |

---

## Sprint 12 — Phase 3 基盤

| ID  | ステータス | 機能 | 詳細 |
|-----|-----------|------|------|
| M1  | [x] | QR チェックイン | セッション当日に QR コードを表示 → 参加者がスキャンして参加確認。`qrcode` ライブラリ + `GET /api/v1/sessions/[id]/qr` + スキャン確認 API |
| M2  | [x] | セッション録音ログ | 演奏後に録音 URL（YouTube / SoundCloud 等）を添付。`PerformanceLog.recordingUrl` フィールド追加 |
| M3  | [x] | PWA 対応 | `manifest.json` + Service Worker + オフラインフォールバックページ。モバイルで「ホーム画面に追加」対応 |

---

## ⛔ Claude が自律実装できないもの（要胡田判断）

| 機能 | 必要なアクション |
|------|----------------|
| 有料イベント支援 | Stripe アカウント作成 + API キー提供が必要 |
| SNS コード確認（会場認証） | X API Basic 以上（月 $100）の契約判断が必要 |
| スタジオ予約外部連携 | 連携先（VACAN / ResTime 等）の選定が必要 |
