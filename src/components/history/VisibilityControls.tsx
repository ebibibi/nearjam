'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface VisibilityState {
  visParticipation: boolean;
  visInstrument: boolean;
  visSongPerformance: boolean;
  visCoPerformers: boolean;
}

interface VisibilityControlsProps {
  logId: string;
  initial: VisibilityState;
}

export function VisibilityControls({ logId, initial }: VisibilityControlsProps) {
  const t = useTranslations('history');
  const [vis, setVis] = useState<VisibilityState>(initial);
  const [saving, setSaving] = useState(false);

  async function toggle(field: keyof VisibilityState) {
    const next = { ...vis, [field]: !vis[field] };
    setVis(next);
    setSaving(true);
    await fetch(`/api/v1/performance-logs/${logId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: next[field] }),
    });
    setSaving(false);
  }

  const fields: { key: keyof VisibilityState; label: string }[] = [
    { key: 'visParticipation', label: t('visParticipation') },
    { key: 'visInstrument', label: t('visInstrument') },
    { key: 'visSongPerformance', label: t('visSongPerformance') },
    { key: 'visCoPerformers', label: t('visCoPerformers') },
  ];

  return (
    <details className="mt-2">
      <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
        {t('visibilitySettings')} {saving && '…'}
      </summary>
      <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-100">
        {fields.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={vis[key]}
              onChange={() => toggle(key)}
              className="h-3 w-3 rounded border-gray-300 text-violet-600"
            />
            {label}
          </label>
        ))}
      </div>
    </details>
  );
}
