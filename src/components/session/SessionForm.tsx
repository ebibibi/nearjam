'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MoodFlagBadges } from './MoodFlagBadges';

interface SessionFormProps {
  locale: string;
  venues: { id: string; name: string }[];
  studios: { id: string; name: string }[];
}

export function SessionForm({ locale, venues, studios }: SessionFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moodFlags, setMoodFlags] = useState<string[]>([]);

  const [values, setValues] = useState({
    title: '',
    venueId: '',
    studioId: '',
    startsAt: '',
    durationMinutes: '',
    format: 'OPEN',
    isSyncroom: false,
    maxParticipants: '',
    registrationRequired: false,
    description: '',
  });

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValues((prev) => ({
      ...prev,
      [field]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value,
    }));

  function toggleMoodFlag(flag: string) {
    setMoodFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const body = {
      title: values.title,
      venueId: values.venueId || undefined,
      studioId: values.studioId || undefined,
      startsAt: new Date(values.startsAt).toISOString(),
      durationMinutes: values.durationMinutes ? parseInt(values.durationMinutes, 10) : undefined,
      format: values.format,
      isSyncroom: values.isSyncroom,
      moodFlags,
      maxParticipants: values.maxParticipants ? parseInt(values.maxParticipants, 10) : undefined,
      registrationRequired: values.registrationRequired,
      description: values.description || undefined,
    };

    const res = await fetch('/api/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t('common.error'));
      setIsLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/${locale}/sessions/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('session.title')} <span className="text-red-500">*</span>
        </label>
        <Input value={values.title} onChange={set('title')} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('session.startTime')} <span className="text-red-500">*</span>
          </label>
          <Input type="datetime-local" value={values.startsAt} onChange={set('startsAt')} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('session.duration')}
          </label>
          <Input type="number" value={values.durationMinutes} onChange={set('durationMinutes')} min={30} max={480} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('session.venue')}</label>
        <Select value={values.venueId} onChange={set('venueId')}>
          <option value="">— {t('session.noVenue')} —</option>
          {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
      </div>

      {!values.venueId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('session.studio')}</label>
          <Select value={values.studioId} onChange={set('studioId')}>
            <option value="">—</option>
            {studios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('session.format')}</label>
        <Select value={values.format} onChange={set('format')}>
          {(['OPEN', 'INVITE', 'THEME'] as const).map((f) => (
            <option key={f} value={f}>{t(`session.formats.${f}`)}</option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('session.moodFlags')}</label>
        <MoodFlagBadges flags={[]} selectable selected={moodFlags} onToggle={toggleMoodFlag} />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={values.isSyncroom}
            onChange={set('isSyncroom')}
            className="h-4 w-4 rounded border-gray-300 text-violet-600"
          />
          <span className="text-sm text-gray-700">{t('session.isSyncroom')}</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={values.registrationRequired}
            onChange={set('registrationRequired')}
            className="h-4 w-4 rounded border-gray-300 text-violet-600"
          />
          <span className="text-sm text-gray-700">{t('session.registrationRequired')}</span>
        </label>
      </div>

      {values.registrationRequired && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('session.maxParticipants')}
          </label>
          <Input type="number" value={values.maxParticipants} onChange={set('maxParticipants')} min={1} max={200} />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('session.description')}
        </label>
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[100px]"
          value={values.description}
          onChange={set('description')}
          maxLength={2000}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" isLoading={isLoading}>{t('common.save')}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>{t('common.cancel')}</Button>
      </div>
    </form>
  );
}
