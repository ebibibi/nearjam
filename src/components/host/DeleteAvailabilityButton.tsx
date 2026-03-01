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
  const router = useRouter()

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) return
    setLoading(true)
    await fetch(`/api/v1/host-availability/${id}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-red-500 hover:underline disabled:opacity-50"
    >
      {label}
    </button>
  )
}
