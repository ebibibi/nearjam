import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[stripe] STRIPE_SECRET_KEY が未設定です。Stripe 機能は無効化されます。')
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-02-25.clover' })
  : null

// NearJam プラットフォーム手数料: 1%（Stripe の 3.6% に加算）
export const PLATFORM_FEE_PERCENT = 0.01

/**
 * プラットフォーム手数料（円）を計算する
 * Stripe の application_fee_amount に設定する値
 */
export function calcPlatformFee(amountYen: number): number {
  return Math.floor(amountYen * PLATFORM_FEE_PERCENT)
}

/**
 * キャンセルポリシーに基づいて返金額（円）を計算する
 *
 * デフォルトポリシー（ticketPriceYen が設定されている場合）:
 *   - 3日前以前: 全額返金（100%）
 *   - 1〜2日前: 70%返金（30%キャンセル料）
 *   - 当日（0日前）: 返金なし（100%キャンセル料）
 */
export function calcRefundAmount(
  paidAmountYen: number,
  sessionStartsAt: Date,
  cancelledAt: Date = new Date(),
  policy?: CancellationPolicy | null
): number {
  const daysUntilSession = Math.floor(
    (sessionStartsAt.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  const tiers = policy?.tiers ?? DEFAULT_CANCELLATION_TIERS

  // daysUntil が大きい順に並んでいる前提で、最初にマッチしたものを適用
  for (const tier of [...tiers].sort((a, b) => b.daysUntil - a.daysUntil)) {
    if (daysUntilSession >= tier.daysUntil) {
      return Math.floor(paidAmountYen * (tier.refundPercent / 100))
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
