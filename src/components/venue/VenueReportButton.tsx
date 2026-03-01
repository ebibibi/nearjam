'use client'

import { useState } from 'react'

interface Props {
  venueId: string
}

export function VenueReportButton({ venueId }: Props) {
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
      setError(data.error ?? '送信に失敗しました')
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
        報告を受け付けました。運営が確認します。
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-gray-400 hover:text-red-600"
      >
        不正・なりすましを報告
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">会場なりすまし報告</h2>

            {error && (
              <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">報告理由 *</label>
                <textarea
                  required
                  minLength={10}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full rounded border px-3 py-2 text-sm"
                  placeholder="なりすましと判断した理由を詳しく記述してください"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">証拠 URL（任意）</label>
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
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded bg-red-600 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? '送信中...' : '報告する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
