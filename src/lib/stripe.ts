import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[stripe] STRIPE_SECRET_KEY が未設定です。Stripe 機能は無効化されます。')
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })
  : null

// NearJam プラットフォーム手数料: 1%（Stripe の 3.6% に加算）
export const PLATFORM_FEE_PERCENT = 0.01

// Stripe 決済手数料率（JPY カード決済）
// キャンセル時の返金計算に使用。実際の Stripe 手数料は Stripe ダッシュボードで確認のこと。
export const STRIPE_FEE_RATE = 0.036

/**
 * プラットフォーム手数料（円）を計算する
 * Stripe の application_fee_amount に設定する値
 */
export function calcPlatformFee(amountYen: number): number {
  return Math.floor(amountYen * PLATFORM_FEE_PERCENT)
}

/**
 * ホストの純受取額（円）を計算する
 *
 * 設計原則: キャンセルした参加者がすべての手数料を負担する。
 * ホストはどのタイミングでキャンセルされても損失を被らない。
 *
 * 例: チケット 1,000 円
 *   Stripe 手数料: 36 円（3.6%）
 *   NearJam 手数料: 10 円（1%）
 *   ホスト純受取: 954 円
 */
export function calcHostNetAmount(paidAmountYen: number): number {
  const stripeFee = Math.floor(paidAmountYen * STRIPE_FEE_RATE)
  const platformFee = calcPlatformFee(paidAmountYen)
  return paidAmountYen - stripeFee - platformFee
}

/**
 * キャンセルポリシーに基づいて返金額（円）を計算する
 *
 * タイムゾーン設計:
 *   hoursUntil は絶対時間（ミリ秒差）で計算する。
 *   UTC・JST・その他どのタイムゾーンでも結果は同一。
 *   「72時間前」はセッション開始の 72時間前の瞬間を指し、
 *   日付や曜日・タイムゾーンに依存しない。
 *
 * 返金はホストの純受取額をベースに計算する。
 * これにより、キャンセルした参加者が Stripe 手数料と NearJam 手数料を
 * 全額負担し、ホストは損失を被らない。
 *
 * 例: チケット 1,000 円、ホスト純受取 954 円
 *   - 72時間以上前: 返金 954 円（参加者負担: 46 円 = 手数料のみ）
 *   - 24〜72時間前: 返金 667 円（参加者負担: 333 円）
 *   - 24時間未満:   返金 0 円（参加者負担: 1,000 円）
 */
export function calcRefundAmount(
  paidAmountYen: number,
  sessionStartsAt: Date,
  cancelledAt: Date = new Date(),
  policy?: CancellationPolicy | null
): number {
  const hostNetAmountYen = calcHostNetAmount(paidAmountYen)
  const hoursUntilSession =
    (sessionStartsAt.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60)

  const tiers = policy?.tiers ?? DEFAULT_CANCELLATION_TIERS

  // hoursUntil が大きい順に並べ、最初にマッチしたティアを適用
  for (const tier of [...tiers].sort((a, b) => b.hoursUntil - a.hoursUntil)) {
    if (hoursUntilSession >= tier.hoursUntil) {
      return Math.floor(hostNetAmountYen * (tier.refundPercent / 100))
    }
  }

  return 0
}

export interface CancellationTier {
  hoursUntil: number    // セッション開始の何時間前まで（絶対時間）
  refundPercent: number // 返金率 (0〜100)
}

export interface CancellationPolicy {
  tiers: CancellationTier[]
}

export const DEFAULT_CANCELLATION_TIERS: CancellationTier[] = [
  { hoursUntil: 72, refundPercent: 100 }, // 72時間（3日）以上前: 手数料のみ差し引いて返金
  { hoursUntil: 24, refundPercent: 70 },  // 24〜72時間前: 70%返金
  { hoursUntil: 0,  refundPercent: 0 },   // 24時間未満: 返金なし
]

/**
 * キャンセルポリシーの説明文を生成する（Stripe Checkout の description 等に使用）
 */
export function describeCancellationPolicy(
  policy?: CancellationPolicy | null,
  locale: 'ja' | 'en' = 'ja',
): string {
  const tiers = policy?.tiers ?? DEFAULT_CANCELLATION_TIERS
  const sorted = [...tiers].sort((a, b) => b.hoursUntil - a.hoursUntil)

  return sorted
    .map((tier) => {
      if (locale === 'en') {
        if (tier.refundPercent === 100) return `Up to ${tier.hoursUntil}h before: full refund (minus fees)`
        if (tier.refundPercent === 0)   return `Under ${tier.hoursUntil}h: no refund`
        return `${tier.hoursUntil}h+: ${100 - tier.refundPercent}% fee (${tier.refundPercent}% refund)`
      }
      if (tier.refundPercent === 100) return `${tier.hoursUntil}時間前まで: 手数料差し引き返金`
      if (tier.refundPercent === 0)   return `${tier.hoursUntil}時間未満: 返金なし`
      return `${tier.hoursUntil}時間前〜: ${100 - tier.refundPercent}%キャンセル料（${tier.refundPercent}%返金）`
    })
    .join(' / ')
}
