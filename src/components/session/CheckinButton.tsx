'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface Props {
  sessionId: string
}

export function CheckinButton({ sessionId }: Props) {
  const t = useTranslations('session.checkin')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const handleCheckin = async () => {
    setStatus('loading')
    const res = await fetch(`/api/v1/sessions/${sessionId}/checkin`, {
      method: 'POST',
    })
    const data = await res.json()

    if (res.ok) {
      setStatus('done')
      setMessage(t('done'))
    } else {
      setStatus('error')
      setMessage(data.error ?? t('error'))
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-xl bg-green-50 p-6 text-center text-green-700">
        <div className="mb-2 text-3xl">✅</div>
        <p className="font-semibold">{message}</p>
      </div>
    )
  }

  return (
    <div>
      {status === 'error' && (
        <p className="mb-3 text-sm text-red-600">{message}</p>
      )}
      <button
        onClick={handleCheckin}
        disabled={status === 'loading'}
        className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {status === 'loading' ? t('loading') : t('action')}
      </button>
    </div>
  )
}
