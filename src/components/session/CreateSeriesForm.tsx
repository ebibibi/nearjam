'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'

interface Props {
  venues: { id: string; name: string }[]
}

export function CreateSeriesForm({ venues }: Props) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('session.series.form')
  const tWeekday = useTranslations('tendency.weekdayFull')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const WEEKDAY_OPTIONS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const

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
      router.push(`/${locale}/session-series`)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? t('error'))
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-red-700">{error}</div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">{t('nameLabel')}</label>
        <input
          type="text"
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('namePlaceholder')}
        />
      </div>

      {venues.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium">{t('venueLabel')}</label>
          <select
            value={form.venueId}
            onChange={(e) => setForm((f) => ({ ...f, venueId: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="">{t('venueSelect')}</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('freqLabel')}</label>
          <select
            value={form.freq}
            onChange={(e) => setForm((f) => ({ ...f, freq: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="WEEKLY">{t('weekly')}</option>
            <option value="MONTHLY">{t('monthly')}</option>
          </select>
        </div>

        {form.freq === 'WEEKLY' && (
          <div>
            <label className="mb-1 block text-sm font-medium">{t('weekdayLabel')}</label>
            <select
              value={form.weekday}
              onChange={(e) => setForm((f) => ({ ...f, weekday: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2"
            >
              {WEEKDAY_OPTIONS.map((d) => (
                <option key={d} value={d}>{tWeekday(d)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{t('startTimeLabel')}</label>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t('durationLabel')}</label>
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
        <label className="mb-1 block text-sm font-medium">{t('descLabel')}</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          className="w-full rounded-lg border px-3 py-2"
          placeholder={t('descPlaceholder')}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{t('maxLabel')}</label>
        <input
          type="number"
          min={2}
          max={200}
          value={form.maxParticipants}
          onChange={(e) => setForm((f) => ({ ...f, maxParticipants: e.target.value }))}
          className="w-full rounded-lg border px-3 py-2"
          placeholder={t('maxPlaceholder')}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}
