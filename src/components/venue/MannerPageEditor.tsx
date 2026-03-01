'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import ReactMarkdown from 'react-markdown'

interface Props {
  venueId: string
  initialContent: string
}

export function MannerPageEditor({ venueId, initialContent }: Props) {
  const router = useRouter()
  const t = useTranslations('venue.editor')
  const [content, setContent] = useState(initialContent)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch(`/api/v1/venues/${venueId}/rules`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rulesMarkdown: content }),
    })

    if (res.ok) {
      setSaved(true)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error ?? t('saveFailed'))
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPreview(false)}
          className={`rounded px-3 py-1.5 text-sm ${!preview ? 'bg-blue-600 text-white' : 'border text-gray-600 hover:bg-gray-50'}`}
        >
          {t('edit')}
        </button>
        <button
          onClick={() => setPreview(true)}
          className={`rounded px-3 py-1.5 text-sm ${preview ? 'bg-blue-600 text-white' : 'border text-gray-600 hover:bg-gray-50'}`}
        >
          {t('preview')}
        </button>
        <span className="ml-auto text-xs text-gray-400">{t('markdownFormat')}</span>
      </div>

      {preview ? (
        <div className="min-h-64 rounded-lg border bg-white p-4 prose prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="w-full rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t('placeholder')}
        />
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {saved && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{t('saved')}</div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? t('saving') : t('save')}
        </button>
      </div>
    </div>
  )
}
