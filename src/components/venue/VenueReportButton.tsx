'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface Props {
  venueId: string
}

export function VenueReportButton({ venueId }: Props) {
  const t = useTranslations('venue.report')
  const tCommon = useTranslations('common')
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/v1/venues/${venueId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason,
        evidenceUrl: evidenceUrl || undefined,
      }),
    })

    if (res.ok) {
      setSubmitted(true)
    } else {
      const data = await res.json()
      setError(data.error ?? t('submitFailed'))
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
        {t('submitted')}
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-gray-400 hover:text-red-600"
      >
        {t('button')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">{t('title')}</h2>

            {error && (
              <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">{t('reasonLabel')}</label>
                <textarea
                  required
                  minLength={10}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full rounded border px-3 py-2 text-sm"
                  placeholder={t('reasonPlaceholder')}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{t('evidenceLabel')}</label>
                <input
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="w-full rounded border px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded border py-2 text-sm"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded bg-red-600 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? t('submitting') : t('submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
