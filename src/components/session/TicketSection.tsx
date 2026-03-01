'use client'

import { useState } from 'react'
import { describeCancellationPolicy, CancellationPolicy } from '@/lib/stripe'

interface Props {
  sessionId: string
  ticketPriceYen: number
  cancellationPolicy: CancellationPolicy | null
  registrationId?: string
  paymentStatus?: string | null
  hostHasStripe: boolean
}

export function TicketSection({
  sessionId,
  ticketPriceYen,
  cancellationPolicy,
  registrationId,
  paymentStatus,
  hostHasStripe,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelResult, setCancelResult] = useState<{
    refundedAmountYen: number
    cancelFeeYen: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const policyText = describeCancellationPolicy(cancellationPolicy)

  const handlePurchase = async () => {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/v1/sessions/${sessionId}/checkout`, {
      method: 'POST',
    })

    if (res.ok) {
      const data = await res.json()
      window.location.href = data.url
    } else {
      const data = await res.json()
      setError(data.error ?? '決済の開始に失敗しました')
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!registrationId) return
    if (!confirm('キャンセルします。キャンセルポリシーに基づいて返金されます。よろしいですか？')) return

    setCancelLoading(true)
    setError(null)

    const res = await fetch(
      `/api/v1/sessions/${sessionId}/registrations/${registrationId}/cancel`,
      { method: 'POST' }
    )

    const data = await res.json()
    if (res.ok) {
      setCancelResult({
        refundedAmountYen: data.refundedAmountYen,
        cancelFeeYen: data.cancelFeeYen,
      })
    } else {
      setError(data.error ?? 'キャンセルに失敗しました')
    }
    setCancelLoading(false)
  }

  if (cancelResult) {
    return (
      <div className="rounded-xl border bg-green-50 p-4">
        <p className="font-semibold text-green-700">キャンセル完了</p>
        <p className="text-sm text-green-600">
          返金額: {cancelResult.refundedAmountYen.toLocaleString()}円
          {cancelResult.cancelFeeYen > 0 && (
            <span className="ml-2 text-orange-600">
              （キャンセル料: {cancelResult.cancelFeeYen.toLocaleString()}円）
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-gray-500">返金は数日以内にカードに反映されます</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border p-4 space-y-3">
      {/* 参加費 */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-700">参加費</span>
        <span className="text-2xl font-bold text-blue-700">
          ¥{ticketPriceYen.toLocaleString()}
        </span>
      </div>

      {/* Stripe 決済の価値説明 */}
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
        <p className="font-medium">💳 事前決済のメリット</p>
        <p className="mt-1 text-blue-600">
          現地集金でも参加できますが、事前に Stripe 決済しておくと
          <strong>当日キャンセル時もキャンセル料を確実に回収</strong>できます。
        </p>
      </div>

      {/* キャンセルポリシー */}
      <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2 text-sm">
        <p className="font-medium text-gray-700">キャンセルポリシー</p>

        {/* 返金額の内訳（参加費をベースに計算して表示） */}
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left font-normal pb-1">タイミング</th>
              <th className="text-right font-normal pb-1">あなたへの返金</th>
              <th className="text-right font-normal pb-1">あなたの負担</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-1">✅ 3日前以前</td>
              <td className="py-1 text-right text-green-600">
                ¥{Math.floor((ticketPriceYen - Math.floor(ticketPriceYen * 0.036) - Math.floor(ticketPriceYen * 0.01)) * 1.0).toLocaleString()}
              </td>
              <td className="py-1 text-right text-orange-500">
                ¥{(ticketPriceYen - Math.floor((ticketPriceYen - Math.floor(ticketPriceYen * 0.036) - Math.floor(ticketPriceYen * 0.01)) * 1.0)).toLocaleString()}
                <span className="text-gray-400 ml-1">（手数料のみ）</span>
              </td>
            </tr>
            <tr>
              <td className="py-1">⚠️ 1〜2日前</td>
              <td className="py-1 text-right text-yellow-600">
                ¥{Math.floor((ticketPriceYen - Math.floor(ticketPriceYen * 0.036) - Math.floor(ticketPriceYen * 0.01)) * 0.7).toLocaleString()}
              </td>
              <td className="py-1 text-right text-orange-500">
                ¥{(ticketPriceYen - Math.floor((ticketPriceYen - Math.floor(ticketPriceYen * 0.036) - Math.floor(ticketPriceYen * 0.01)) * 0.7)).toLocaleString()}
              </td>
            </tr>
            <tr>
              <td className="py-1">❌ 当日</td>
              <td className="py-1 text-right text-red-500">¥0</td>
              <td className="py-1 text-right text-red-500">¥{ticketPriceYen.toLocaleString()}（全額）</td>
            </tr>
          </tbody>
        </table>

        <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">
          ※ Stripe 決済手数料（3.6%）と NearJam 手数料（1%）は、決済を処理するためのコストです。
          キャンセルした場合でも、これらの手数料はご返金できません。
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* 決済 or キャンセルボタン */}
      {paymentStatus === 'paid' ? (
        <div className="space-y-2">
          <div className="rounded-lg bg-green-50 p-2 text-center text-sm text-green-700">
            ✅ 決済済み
          </div>
          {registrationId && (
            <button
              onClick={handleCancel}
              disabled={cancelLoading}
              className="w-full rounded-lg border border-red-300 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {cancelLoading ? 'キャンセル中...' : 'キャンセルする（ポリシー適用）'}
            </button>
          )}
        </div>
      ) : !hostHasStripe ? (
        <p className="text-center text-sm text-gray-400">
          ホストが Stripe 未設定のため事前決済できません
        </p>
      ) : (
        <button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '決済ページへ移動中...' : `¥${ticketPriceYen.toLocaleString()} を Stripe で支払う`}
        </button>
      )}

      <p className="text-center text-xs text-gray-400">
        現地集金での参加も可能です
      </p>
    </div>
  )
}
