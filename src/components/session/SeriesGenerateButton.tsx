'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface Props {
  seriesId: string
}

export function SeriesGenerateButton({ seriesId }: Props) {
  const router = useRouter()
  const t = useTranslations('session.series')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ created: number } | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    setResult(null)

    const today = new Date()
    const threeMonthsLater = new Date(today)
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)

    const res = await fetch(`/api/v1/session-series/${seriesId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromDate: today.toISOString().split('T')[0],
        toDate: threeMonthsLater.toISOString().split('T')[0],
      }),
    })

    const data = await res.json()
    setResult({ created: data.created ?? 0 })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 disabled:opacity-50"
      >
        {loading ? t('generating') : t('generate')}
      </button>
      {result && (
        <span className="text-xs text-gray-500">
          {result.created > 0 ? t('generated', { n: result.created }) : t('noNew')}
        </span>
      )}
    </div>
  )
}
