'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface Props {
  sessionId: string
  toUserId?: string
  toVenueId?: string
}

export function FeedbackForm({ sessionId, toUserId, toVenueId }: Props) {
  const t = useTranslations('feedback')
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    setError(null)

    const res = await fetch(`/api/v1/sessions/${sessionId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId, toVenueId, message }),
    })

    setSubmitting(false)

    if (res.ok) {
      setDone(true)
      setMessage('')
    } else {
      setError('Failed to send feedback')
    }
  }

  if (done) {
    return <p className="text-xs text-green-600 mt-2">{t('sent')}</p>
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-1 text-xs text-gray-400 hover:text-gray-600 underline"
      >
        {t('send')}
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-2">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t('messagePlaceholder')}
        rows={3}
        maxLength={500}
        required
        className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !message.trim()}
          className="rounded bg-gray-700 px-3 py-1 text-xs text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? '…' : t('send')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </form>
  )
}
