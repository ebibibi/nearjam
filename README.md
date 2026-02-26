# NearJam 🎸

> **Find jam sessions near you — and meet musicians to play with.**

NearJam is a two-sided discovery and matching platform for amateur jam sessions. Whether you're a musician searching for a place to play your favorite songs, or a bar owner trying to fill Thursday night's session slots, NearJam connects the right people in the right place.

---

## The Problem

- You want to play a specific song or genre, but have no idea where to go
- There's a great session venue nearby you've never heard of
- When you do find a session, you spend the first hour figuring out "who plays what"
- The same people end up jamming in the same place every time
- Jam session info is scattered across Instagram, X, and word-of-mouth — impossible to discover

## The Solution

NearJam works on three layers:

**Discovery** — Venues, studios, and session tendencies are visible on a map. Info comes from three sources: 🤖 auto-collected from venue SNS/websites, 👥 crowdsourced by musicians who've been there, and ✅ verified by venue owners. You know what to expect before you arrive.

**Before the session** — Match musicians with sessions based on songs, instruments, genre, playing style, and location. Sessions can be **in-person or online via SYNCROOM**, so even without a nearby venue, you can play with people nationwide.

**On the day** — Song queue management, part assignments (who plays what), and performance log recording — simple tools to support the MC duties that every session host faces.

---

## Who It's For

| User type | What they get |
|-----------|--------------|
| 🎸 **Musician** | Find sessions that match your style and songs near you. Get notified when a session is playing something in your wishlist. Connect with like-minded players. |
| 🏠 **Venue** | Register your session info, attract matching musicians, and use live management tools on the day. |
| 🏢 **Studio** | Get discovered by musicians looking for a space to organize their own sessions. |

---

## Key Features

### Place Discovery (Venues & Studios)

- **Map view** — All venues and studios on Google Maps. Filter by genre, day of week, SYNCROOM support, skill level, and more
- **Session tendencies** — Because the same venue can run completely different session concepts on different nights, each venue can have multiple "tendency" entries. Thursday jazz and Saturday rock are described separately
- **Three-source data model**:
  - 🤖 **Auto-collected**: Bot scrapes venue SNS and websites, extracts session info, publishes after review
  - 👥 **Crowdsourced**: Any musician can add info about a venue based on their experience
  - ✅ **Owner-verified**: Venue/studio owner claims the page and verifies via HP email or SNS code
- **Studio rooms**: Detailed room info including capacity, instruments, and hourly rates — enabling musician groups to book a space for their own session
- **Get directions**: One tap to open Google Maps routing from your location

### Musician Matching

- **Privacy-first**: Wishlists, style preferences, and skill level are **private by default**. Matching happens silently server-side — notifications arrive, but your preferences are never exposed to others
- **Song-based matching**: Add songs to your wishlist → get notified (only you) when a session plans to play them
- **Coverage areas**: Specify multiple areas where you can play, not just your home base — your commute route, a second city, etc. (visibility: public/private)
- **SYNCROOM support**: Flag yourself as available for SYNCROOM sessions, with optional room and connection notes (visibility: public/private)
- **Style matching**: Skill level, how much you want to play, challenge attitude, and feedback style — all factor in to prevent "that wasn't what I expected" situations
- **Area matching**: In-person sessions within your travel range; SYNCROOM sessions weighted by song/style only

### Session Tools

- Pre-register song list, instrument needs, and mood flags for attendees to check before the day
- On the day: song queue, part hand-raising, key notes per song (vocalist's preset key visible to all)
- Performance log: who played what, with per-axis privacy control
- Performance balance dashboard: see who's played how many times

### Safety Design

- Nicknames only — no real names required
- Location abstraction — area/district, not precise address
- DM only after mutual connection approval
- Connection request cooldown after rejection
- Block & report
- No swipe/like UI patterns — matching is for music, not dating

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Next.js 16                      │
│         (App Router + TypeScript + Tailwind)     │
├─────────────────────────────────────────────────┤
│  Auth: NextAuth.js v5 (Google OAuth + Magic Link)│
│  DB:   Prisma v7 + PostgreSQL 16                 │
│  Host: Azure Static Web Apps                     │
│  CI:   GitHub Actions                            │
└─────────────────────────────────────────────────┘
```

---

## Documentation

- [Product Requirements (PRD)](./docs/product-requirements.md)
- [Technical Design](./docs/technical-design.md)

---

## Development Setup

```bash
# Prerequisites: Docker, Node.js 22+

git clone https://github.com/ebibibi/nearjam.git
cd nearjam

npm install

# Start local PostgreSQL
docker compose up -d

# Configure environment
cp .env.example .env.local
# Edit .env.local: set DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET

# Run database migrations and seed
npm run db:migrate
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run pending migrations (dev) |
| `npm run db:seed` | Insert test data |
| `npm run db:reset` | Reset DB and re-seed |
| `npm run db:studio` | Open Prisma Studio |

---

## Status

🚧 Early development. First beta target: jam session bars in Kashiwa, Chiba.

---

## License

MIT

---

---

# NearJam 🎸 （日本語）

> **近くのジャムセッションを見つけよう — そして一緒に演奏できる人を探そう。**

NearJam は、アマチュアジャムセッションのための**二面型ディスカバリー＆マッチングプラットフォーム**です。好きな曲を弾ける場所を探しているミュージシャンも、木曜夜のセッション枠を埋めたいバーのオーナーも、NearJam が橋渡しをします。

---

## 課題

- 演りたい曲・ジャンルがあっても、どこへ行けばいいかわからない
- 近くに素晴らしいセッション会場があるのに、その存在を知らない
- セッションに参加しても「誰が何を弾くか」の決定に時間がかかる
- いつも同じ顔ぶれ・同じ場所でしか演奏していない
- 会場情報がInstagram・X・口コミに散らばっていて、全然見つからない

## 解決策

NearJam は3層で機能します。

**ディスカバリー** — 会場・スタジオ・セッション傾向を地図で確認できます。情報は3つのソースから集まります: 🤖 会場のSNS/HPから自動収集、👥 行ったことのあるミュージシャンによる口コミ、✅ 会場オーナーによる公式認証。行く前に何を期待できるかがわかります。

**セッション前** — 曲・楽器・ジャンル・演奏スタイル・場所でミュージシャンとセッションをマッチング。**対面セッションはもちろん、SYNCROOMオンラインセッション**にも対応しているため、近くに会場がなくても全国の人と演奏できます。

**セッション当日** — 曲のキュー管理、パート割り当て、演奏ログの記録まで、シンプルなツールでサポートします。

---

## 誰のためのサービスか

| ユーザー種別 | 得られるもの |
|------------|------------|
| 🎸 **ミュージシャン** | 自分のスタイルや演りたい曲に合ったセッションを近くで見つける。ウィッシュリストの曲が予定されたセッションの通知を受け取る。同じ志向の演奏仲間と繋がる。 |
| 🏠 **会場（お店）** | セッション傾向とイベント情報を登録してマッチするミュージシャンを集める。当日はライブ管理ツールで進行をサポート。 |
| 🏢 **スタジオ** | セッションを企画したいミュージシャングループに発見してもらう。 |

---

## 主な機能

### 場所のディスカバリー（会場・スタジオ）

- **地図表示** — 全会場・スタジオをGoogle Maps上に表示。ジャンル・曜日・SYNCROOM対応・レベル感などでフィルタリング
- **セッション傾向** — 同じ会場でも曜日によってコンセプトが全然違うことが多い。そのため、会場ごとに複数の「セッション傾向」エントリを登録できます。木曜ジャズと土曜ロックは別々に説明されます
- **3ソースデータモデル**:
  - 🤖 **自動収集**: Botが会場のSNS・HPをスクレイピングしてセッション情報を抽出・レビュー後に公開
  - 👥 **口コミ**: 行ったことのあるミュージシャンなら誰でも会場情報を追加・編集できる
  - ✅ **オーナー認証**: 会場・スタジオのオーナーがHP掲載メールまたはSNS確認コードでページを公式認証
- **スタジオ部屋情報**: 部屋ごとの定員・機材・時間料金を掲載。ミュージシャングループが自分たちでスタジオを手配してセッションできる
- **経路案内**: ワンタップでGoogle Maps経路を開く

### ミュージシャンマッチング

- **プライバシーファースト**: ウィッシュリスト・スタイル希望・スキルレベルは**デフォルト非公開**。マッチングはサーバーサイドで静かに行われ、他者にあなたの希望は伝わりません
- **曲ベースマッチング**: ウィッシュリストに曲を登録 → そのセッションが開催されたとき本人だけに通知
- **カバーエリア**: 拠点エリアだけでなく、演奏できる複数のエリアを登録可能（通勤経路上の街や第2の拠点など）。公開可否は選択制
- **SYNCROOM対応**: オンラインセッションへの参加可否を設定。部屋情報・接続環境メモも任意で追加。公開可否は選択制
- **スタイルマッチング**: スキルレベル・演奏量の希望・チャレンジ姿勢・フィードバックへの姿勢を考慮。「来てみたら全然違う雰囲気だった」を事前に防ぐ
- **エリアマッチング**: 対面セッションは移動可能距離内。SYNCROOMセッションは場所不問で曲・スタイル重視

### セッションツール

- 曲リスト・募集楽器・ムードフラグを事前に登録して参加者が確認できるように
- 当日: 曲キュー、パートの手挙げ、曲ごとのキーメモ（ボーカリストの事前指定キーを全員が確認可能）
- 演奏ログ: 誰が何の曲をどのパートで演奏したか。情報軸ごとに公開範囲を個別制御
- 演奏バランスダッシュボード: 参加者ごとの演奏回数をリアルタイム確認

### 安全設計

- ニックネームのみ（本名不要）
- 位置情報はエリア・地区名（精密な住所は不使用）
- 相互承認後のみDM可能
- 申請拒否後のクールダウン
- ブロック・通報
- スワイプ/いいね型UIは採用しない（マッチングは音楽のため）

---

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────┐
│                 Next.js 16                       │
│       (App Router + TypeScript + Tailwind)       │
├─────────────────────────────────────────────────┤
│  認証: NextAuth.js v5 (Google OAuth + マジックリンク) │
│  DB:  Prisma v7 + PostgreSQL 16                  │
│  ホスト: Azure Static Web Apps                   │
│  CI:  GitHub Actions                             │
└─────────────────────────────────────────────────┘
```

---

## ドキュメント

- [プロダクト要件定義書（PRD）](./docs/product-requirements.md)
- [技術設計書](./docs/technical-design.md)

---

## ステータス

🚧 初期開発中。最初のβテスト対象: 千葉県柏エリアのセッションバー

---

## ライセンス

MIT
