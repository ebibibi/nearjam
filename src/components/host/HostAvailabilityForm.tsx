'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'

interface Venue {
  id: string
  name: string
}

interface Props {
  locale: string
  venues: Venue[]
}

interface SongResult {
  id: string
  title: string
  artist: string | null
}

function fetcher(url: string) {
  return fetch(url).then((r) => r.json())
}

export function HostAvailabilityForm({ venues }: Props) {
  const t = useTranslations('hostAvailability')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('19:00')
  const [duration, setDuration] = useState(120)
  const [instruments, setInstruments] = useState('')
  const [notes, setNotes] = useState('')
  const [venueId, setVenueId] = useState('')

  // Song selection
  const [songQuery, setSongQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedSongs, setSelectedSongs] = useState<SongResult[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSongQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSongQuery(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQuery(value), 400)
  }

  const songUrl = debouncedQuery
    ? `/api/v1/songs?limit=10&q=${encodeURIComponent(debouncedQuery)}`
    : null
  const { data: songResults } = useSWR<SongResult[]>(songUrl, fetcher)

  function addSong(song: SongResult) {
    if (!selectedSongs.find((s) => s.id === song.id)) {
      setSelectedSongs((prev) => [...prev, song])
    }
    setSongQuery('')
    setDebouncedQuery('')
  }

  function removeSong(id: string) {
    setSelectedSongs((prev) => prev.filter((s) => s.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const instrumentList = instruments
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    if (instrumentList.length === 0) {
      setError(t('instruments') + ' is required')
      return
    }

    if (selectedSongs.length === 0) {
      setError(t('songs') + ' is required')
      return
    }

    setSaving(true)

    const res = await fetch('/api/v1/host-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venueId: venueId || undefined,
        availableDate: date,
        startTime,
        durationMinutes: duration,
        songIds: selectedSongs.map((s) => s.id),
        instruments: instrumentList,
        notes: notes || undefined,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Failed to save')
      return
    }

    setSuccess(true)
    setOpen(false)
    setDate('')
    setStartTime('19:00')
    setDuration(120)
    setInstruments('')
    setNotes('')
    setVenueId('')
    setSelectedSongs([])
    router.refresh()
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => { setOpen(true); setSuccess(false) }}
          className="rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-700"
        >
          + {t('add')}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-lg border p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('date')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('startTime')} <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('duration')}
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {[60, 90, 120, 150, 180, 240, 300].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                会場（任意）
              </label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">—</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('instruments')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={instruments}
              onChange={(e) => setInstruments(e.target.value)}
              placeholder={t('instrumentsHint')}
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('songs')} <span className="text-red-500">*</span>
            </label>
            {selectedSongs.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {selectedSongs.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700"
                  >
                    {s.title}
                    <button
                      type="button"
                      onClick={() => removeSong(s.id)}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                value={songQuery}
                onChange={handleSongQueryChange}
                placeholder="曲名で検索..."
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {songResults && songResults.length > 0 && songQuery && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg">
                  {songResults.map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      onClick={() => addSong(song)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      <span className="font-medium">{song.title}</span>
                      {song.artist && <span className="text-gray-400">— {song.artist}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('notesPlaceholder')}
              rows={3}
              maxLength={500}
              className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-violet-600 px-4 py-2 text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saving ? t('saving') : t('save')}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {success && (
        <p className="mt-3 text-sm text-green-600">{t('saved')}</p>
      )}
    </div>
  )
}
