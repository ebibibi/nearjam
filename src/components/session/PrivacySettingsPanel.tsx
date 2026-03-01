'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface PrivacySettings {
  visSessionFact?: boolean;
  visDatetime?: boolean;
  visSessionName?: boolean;
  visSongListVenue?: boolean;
  adminConsentVisSongList?: boolean;
}

interface PrivacySettingsPanelProps {
  sessionId: string;
  initial: PrivacySettings;
}

export function PrivacySettingsPanel({ sessionId, initial }: PrivacySettingsPanelProps) {
  const t = useTranslations('privacy');
  const [settings, setSettings] = useState<PrivacySettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof PrivacySettings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/privacy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof PrivacySettings; label: string }[] = [
    { key: 'visSessionFact', label: t('visSessionFact') },
    { key: 'visDatetime', label: t('visDatetime') },
    { key: 'visSessionName', label: t('visSessionName') },
    { key: 'visSongListVenue', label: t('visSongListVenue') },
    { key: 'adminConsentVisSongList', label: t('adminConsentVisSongList') },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">{t('title')}</h3>
      <p className="text-xs text-gray-400">
        {t('andConsent')}
      </p>

      <div className="space-y-3">
        {fields.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!settings[key]}
              onChange={() => toggle(key)}
              className="w-4 h-4 rounded text-violet-600"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="text-sm px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {saving ? '…' : t('save')}
        </button>
        {saved && <span className="text-sm text-green-600">{t('saved')}</span>}
      </div>
    </div>
  );
}
