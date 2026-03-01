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
 * 返金はホストの純受取額をベースに計算する。
 * これにより、キャンセルした参加者が Stripe 手数料と NearJam 手数料を
 * 全額負担し、ホストは損失を被らない。
 *
 * 例: チケット 1,000 円、ホスト純受取 954 円
 *   - 3日前以前: 返金 954 円（参加者負担: 46 円 = 手数料のみ）
 *   - 1〜2日前: 返金 667 円（参加者負担: 333 円）
 *   - 当日: 返金 0 円（参加者負担: 1,000 円）
 */
export function calcRefundAmount(
  paidAmountYen: number,
  sessionStartsAt: Date,
  cancelledAt: Date = new Date(),
  policy?: CancellationPolicy | null
): number {
  const hostNetAmountYen = calcHostNetAmount(paidAmountYen)
  const daysUntilSession = Math.floor(
    (sessionStartsAt.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  const tiers = policy?.tiers ?? DEFAULT_CANCELLATION_TIERS

  // daysUntil が大きい順に並んでいる前提で、最初にマッチしたものを適用
  for (const tier of [...tiers].sort((a, b) => b.daysUntil - a.daysUntil)) {
    if (daysUntilSession >= tier.daysUntil) {
      return Math.floor(hostNetAmountYen * (tier.refundPercent / 100))
    }
  }

  return 0 // 当日キャンセルは返金なし
}

export interface CancellationTier {
  daysUntil: number   // セッション何日前まで
  refundPercent: number // 返金率 (0〜100)
}

export interface CancellationPolicy {
  tiers: CancellationTier[]
}

export const DEFAULT_CANCELLATION_TIERS: CancellationTier[] = [
  { daysUntil: 3, refundPercent: 100 }, // 3日前以前: 全額返金
  { daysUntil: 1, refundPercent: 70 },  // 1〜2日前: 70%返金
  { daysUntil: 0, refundPercent: 0 },   // 当日: 返金なし
]

/**
 * キャンセルポリシーの説明文を生成する
 */
export function describeCancellationPolicy(policy?: CancellationPolicy | null): string {
  const tiers = policy?.tiers ?? DEFAULT_CANCELLATION_TIERS
  const sorted = [...tiers].sort((a, b) => b.daysUntil - a.daysUntil)

  return sorted
    .map((tier) => {
      if (tier.refundPercent === 100) return `${tier.daysUntil}日前まで: 全額返金`
      if (tier.refundPercent === 0) return `当日: 返金なし（100%キャンセル料）`
      return `${tier.daysUntil}日前〜: ${100 - tier.refundPercent}%キャンセル料（${tier.refundPercent}%返金）`
    })
    .join(' / ')
}
