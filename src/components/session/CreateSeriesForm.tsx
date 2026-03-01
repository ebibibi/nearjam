'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const WEEKDAY_OPTIONS = [
  { label: '月', value: 'MO' },
  { label: '火', value: 'TU' },
  { label: '水', value: 'WE' },
  { label: '木', value: 'TH' },
  { label: '金', value: 'FR' },
  { label: '土', value: 'SA' },
  { label: '日', value: 'SU' },
]

interface Props {
  venues: { id: string; name: string }[]
}

export function CreateSeriesForm({ venues }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    venueId: '',
    freq: 'WEEKLY',
    weekday: 'TH',
    startTime: '19:00',
    durationMinutes: 120,
    description: '',
    maxParticipants: '',
  })

  const buildRrule = () => {
    if (form.freq === 'WEEKLY') {
      return `FREQ=WEEKLY;BYDAY=${form.weekday}`
    }
    if (form.freq === 'MONTHLY') {
      return `FREQ=MONTHLY`
    }
    return `FREQ=WEEKLY;BYDAY=${form.weekday}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/v1/session-series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        venueId: form.venueId || undefined,
        rrule: buildRrule(),
        startTime: form.startTime,
        durationMinutes: form.durationMinutes,
        description: form.description || undefined,
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
      }),
    })

    if (res.ok) {
      router.push('/session-series')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? 'エラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-red-700">{error}</div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">シリーズ名 *</label>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="木曜ジャズセッション"
        />
      </div>

      {venues.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium">会場</label>
          <select
            value={form.venueId}
            onChange={(e) => setForm((f) => ({ ...f, venueId: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="">会場を選択</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">繰り返し頻度</label>
          <select
            value={form.freq}
            onChange={(e) => setForm((f) => ({ ...f, freq: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="WEEKLY">毎週</option>
            <option value="MONTHLY">毎月</option>
          </select>
        </div>

        {form.freq === 'WEEKLY' && (
          <div>
            <label className="mb-1 block text-sm font-medium">曜日</label>
            <select
              value={form.weekday}
              onChange={(e) => setForm((f) => ({ ...f, weekday: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2"
            >
              {WEEKDAY_OPTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}曜日</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">開始時刻</label>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">所要時間（分）</label>
          <input
            type="number"
            min={30}
            max={480}
            step={30}
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">説明</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          className="w-full rounded-lg border px-3 py-2"
          placeholder="セッションの雰囲気・レベル感など"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">最大参加者数</label>
        <input
          type="number"
          min={2}
          max={200}
          value={form.maxParticipants}
          onChange={(e) => setForm((f) => ({ ...f, maxParticipants: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
          placeholder="任意"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '作成中...' : 'シリーズを作成'}
      </button>
    </form>
  )
}
