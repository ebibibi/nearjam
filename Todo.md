# NearJam 実装 Todo（PRD v0.4 差分）

> 生成日: 2026-03-01
> PRD との差異分析から抽出。Phase 1 MVP の未実装機能を Sprint 単位で管理する。

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
| F3  | [x] | マッチング通知（Notification レコード作成） | ウィッシュリスト × セッション曲かぶり検知 → `Notification` レコード生成。セッション作成時に fire-and-forget で呼び出し。メール送信は Phase 2（バッチ基盤必要） |

---

## 後回し（Phase 1 だが複雑・インフラ必要）

| 機能 | 理由 |
|------|------|
| 会場認証フロー | HP メールスクレイプ + SNS コード確認。外部 I/O が複雑 |
| 定期セッション管理 | 繰り返し Event パターン（rrule 等） |
| 通知エンジン（フル） | バッチ送信、朝まとめ、タイミング攻撃対策等 |
| Auto-collection bot UI | オペレーターレビューキュー（クローラ基盤は実装済み） |
