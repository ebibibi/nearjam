'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const STAMPS = ['👍', '🎵', '🎉', '🌱', '✨'] as const;
type Stamp = typeof STAMPS[number];

interface KudosFormProps {
  sessionId: string;
  targetUserId: string;
  targetName: string;
}

export function KudosForm({ sessionId, targetUserId, targetName }: KudosFormProps) {
  const t = useTranslations('kudos');
  const [selectedStamp, setSelectedStamp] = useState<Stamp | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!selectedStamp) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/kudos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: targetUserId, stamp: selectedStamp, message: message || undefined }),
      });
      if (res.status === 409) {
        setError(t('alreadySent'));
      } else if (res.ok) {
        setDone(true);
      } else {
        setError(t('sendFailed'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-4 text-green-600">
        {selectedStamp} {t('sent')}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 rounded-xl border border-gray-200 bg-white">
      <p className="text-sm font-medium text-gray-700">
        {targetName} への Kudos
      </p>

      <div>
        <p className="text-xs text-gray-500 mb-2">{t('stamp')}</p>
        <div className="flex gap-3">
          {STAMPS.map((stamp) => (
            <button
              key={stamp}
              onClick={() => setSelectedStamp(stamp)}
              title={t(`stamps.${stamp}`)}
              className={`text-2xl p-2 rounded-lg transition-all ${
                selectedStamp === stamp
                  ? 'bg-violet-100 ring-2 ring-violet-400 scale-110'
                  : 'hover:bg-gray-100'
              }`}
            >
              {stamp}
            </button>
          ))}
        </div>
        {selectedStamp && (
          <p className="text-xs text-violet-600 mt-1">{t(`stamps.${selectedStamp}`)}</p>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">{t('messageLabel')}</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('messagePlaceholder')}
          maxLength={200}
          rows={2}
          className="w-full text-sm rounded-lg border border-gray-200 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        onClick={submit}
        disabled={!selectedStamp || submitting}
        className="w-full text-sm py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? '…' : t('send')}
      </button>
    </div>
  );
}
