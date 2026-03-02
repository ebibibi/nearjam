'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  id: string
  label: string
  confirmMessage: string
}

export function DeleteAvailabilityButton({ id, label, confirmMessage }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/host-availability/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to delete')
        return
      }
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="text-right">
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <button
        onClick={handleDelete}
        disabled={loading}
        className="text-sm text-red-500 hover:underline disabled:opacity-50"
      >
        {label}
      </button>
    </div>
  )
}
