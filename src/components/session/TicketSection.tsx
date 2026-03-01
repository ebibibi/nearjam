'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
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
  const t = useTranslations('session.ticket')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelResult, setCancelResult] = useState<{
    refundedAmountYen: number
    cancelFeeYen: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _policyText = describeCancellationPolicy(cancellationPolicy)

  const handlePurchase = async () => {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/v1/sessions/${sessionId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale }),
    })

    if (res.ok) {
      const data = await res.json()
      window.location.href = data.url
    } else {
      const data = await res.json()
      setError(data.error ?? t('checkoutFailed'))
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!registrationId) return
    if (!confirm(t('cancelConfirm'))) return

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
      setError(data.error ?? t('cancelFailed'))
    }
    setCancelLoading(false)
  }

  if (cancelResult) {
    return (
      <div className="rounded-xl border bg-green-50 p-4">
        <p className="font-semibold text-green-700">{t('cancelDone')}</p>
        <p className="text-sm text-green-600">
          {t('refundAmount', { amount: cancelResult.refundedAmountYen.toLocaleString() })}
          {cancelResult.cancelFeeYen > 0 && (
            <span className="ml-2 text-orange-600">
              {t('cancelFee', { amount: cancelResult.cancelFeeYen.toLocaleString() })}
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-gray-500">{t('refundNote')}</p>
      </div>
    )
  }

  const hostNet = ticketPriceYen - Math.floor(ticketPriceYen * 0.036) - Math.floor(ticketPriceYen * 0.01)

  return (
    <div className="rounded-xl border p-4 space-y-3">
      {/* 参加費 */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-700">{t('price')}</span>
        <span className="text-2xl font-bold text-blue-700">
          ¥{ticketPriceYen.toLocaleString()}
        </span>
      </div>

      {/* Stripe 決済の価値説明 */}
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
        <p className="font-medium">{t('prepayBenefitTitle')}</p>
        <p className="mt-1 text-blue-600">{t('prepayBenefit')}</p>
      </div>

      {/* キャンセルポリシー */}
      <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2 text-sm">
        <p className="font-medium text-gray-700">{t('cancelPolicy')}</p>

        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400">
              <th className="text-left font-normal pb-1">{t('colTimeUntil')}</th>
              <th className="text-right font-normal pb-1">{t('colYourRefund')}</th>
              <th className="text-right font-normal pb-1">{t('colYourCharge')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="py-1">{t('row72h')}</td>
              <td className="py-1 text-right text-green-600">¥{hostNet.toLocaleString()}</td>
              <td className="py-1 text-right text-orange-500">
                ¥{(ticketPriceYen - hostNet).toLocaleString()}
                <span className="text-gray-400 ml-1">{t('feeOnly')}</span>
              </td>
            </tr>
            <tr>
              <td className="py-1">{t('row24to72h')}</td>
              <td className="py-1 text-right text-yellow-600">¥{Math.floor(hostNet * 0.7).toLocaleString()}</td>
              <td className="py-1 text-right text-orange-500">¥{(ticketPriceYen - Math.floor(hostNet * 0.7)).toLocaleString()}</td>
            </tr>
            <tr>
              <td className="py-1">{t('row24h')}</td>
              <td className="py-1 text-right text-red-500">¥0</td>
              <td className="py-1 text-right text-red-500">¥{ticketPriceYen.toLocaleString()}{t('fullAmount')}</td>
            </tr>
          </tbody>
        </table>

        <p className="text-xs text-gray-400 border-t border-gray-100 pt-2">{t('policyNote')}</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* 決済 or キャンセルボタン */}
      {paymentStatus === 'paid' ? (
        <div className="space-y-2">
          <div className="rounded-lg bg-green-50 p-2 text-center text-sm text-green-700">
            {t('paid')}
          </div>
          {registrationId && (
            <button
              onClick={handleCancel}
              disabled={cancelLoading}
              className="w-full rounded-lg border border-red-300 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {cancelLoading ? t('cancelling') : t('cancelAction')}
            </button>
          )}
        </div>
      ) : !hostHasStripe ? (
        <p className="text-center text-sm text-gray-400">{t('noStripe')}</p>
      ) : (
        <button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? t('paying') : t('payButton', { price: ticketPriceYen.toLocaleString() })}
        </button>
      )}

      <p className="text-center text-xs text-gray-400">{t('walkIn')}</p>
    </div>
  )
}
