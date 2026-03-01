'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MoodFlagBadges } from './MoodFlagBadges';

interface SessionFormValues {
  title: string;
  venueId: string;
  studioId: string;
  startsAt: string;
  durationMinutes: string;
  format: string;
  isSyncroom: boolean;
  maxParticipants: string;
  registrationRequired: boolean;
  ticketPriceYen: string;
  description: string;
}

interface SessionFormProps {
  locale: string;
  venues: { id: string; name: string }[];
  studios: { id: string; name: string }[];
  /** 編集モード: セッション ID を渡すと PUT になる */
  sessionId?: string;
  initialValues?: Partial<SessionFormValues>;
  initialMoodFlags?: string[];
}

export function SessionForm({
  locale,
  venues,
  studios,
  sessionId,
  initialValues,
  initialMoodFlags,
}: SessionFormProps) {
  const t = useTranslations();
  const tFee = useTranslations('session.feeSection');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moodFlags, setMoodFlags] = useState<string[]>(initialMoodFlags ?? []);

  const [values, setValues] = useState<SessionFormValues>({
    title: '',
    venueId: '',
    studioId: '',
    startsAt: '',
    durationMinutes: '',
    format: 'OPEN',
    isSyncroom: false,
    maxParticipants: '',
    registrationRequired: false,
    ticketPriceYen: '',
    description: '',
    ...initialValues,
  });

  const set =
    (field: keyof SessionFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((prev) => ({
        ...prev,
        [field]:
          e.target.type === 'checkbox'
            ? (e.target as HTMLInputElement).checked
            : e.target.value,
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
      ticketPriceYen: values.ticketPriceYen ? parseInt(values.ticketPriceYen, 10) : undefined,
      description: values.description || undefined,
    };

    const url = sessionId ? `/api/v1/sessions/${sessionId}` : '/api/v1/sessions';
    const method = sessionId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
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
    const id = sessionId ?? data.id;
    router.push(`/${locale}/sessions/${id}`);
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
          <Input
            type="number"
            value={values.durationMinutes}
            onChange={set('durationMinutes')}
            min={30}
            max={480}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('session.venue')}</label>
        <Select value={values.venueId} onChange={set('venueId')}>
          <option value="">— {t('session.noVenue')} —</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
      </div>

      {!values.venueId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('session.studio')}</label>
          <Select value={values.studioId} onChange={set('studioId')}>
            <option value="">—</option>
            {studios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('session.format')}</label>
        <Select value={values.format} onChange={set('format')}>
          {(['OPEN', 'INVITE', 'THEME'] as const).map((f) => (
            <option key={f} value={f}>
              {t(`session.formats.${f}`)}
            </option>
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
          <Input
            type="number"
            value={values.maxParticipants}
            onChange={set('maxParticipants')}
            min={1}
            max={200}
          />
        </div>
      )}

      {/* Ticket price (paid session settings) */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {tFee('priceLabel')}
            <span className="ml-2 text-xs font-normal text-gray-400">{tFee('priceHint')}</span>
          </label>
          <Input
            type="number"
            value={values.ticketPriceYen}
            onChange={set('ticketPriceYen')}
            min={100}
            placeholder="1500"
          />
        </div>

        {/* Host fee breakdown */}
        <div className="rounded-lg bg-white border border-blue-100 p-3 text-xs text-gray-600 space-y-2">
          <p className="font-semibold text-gray-700">{tFee('feeTitle')}</p>
          {values.ticketPriceYen && parseInt(values.ticketPriceYen, 10) > 0 ? (
            (() => {
              const price = parseInt(values.ticketPriceYen, 10);
              const stripeFee = Math.floor(price * 0.036);
              const platformFee = Math.floor(price * 0.01);
              const hostNet = price - stripeFee - platformFee;
              return (
                <table className="w-full text-xs">
                  <tbody>
                    <tr><td className="py-0.5 text-gray-500">{tFee('participantPays')}</td><td className="text-right font-medium">¥{price.toLocaleString()}</td></tr>
                    <tr><td className="py-0.5 text-gray-400">{tFee('stripeFee')}</td><td className="text-right text-red-400">−¥{stripeFee.toLocaleString()}</td></tr>
                    <tr><td className="py-0.5 text-gray-400">{tFee('platformFee')}</td><td className="text-right text-red-400">−¥{platformFee.toLocaleString()}</td></tr>
                    <tr className="border-t border-blue-100"><td className="pt-1 font-semibold text-blue-700">{tFee('hostReceives')}</td><td className="pt-1 text-right font-bold text-blue-700">¥{hostNet.toLocaleString()}</td></tr>
                  </tbody>
                </table>
              );
            })()
          ) : (
            <p className="text-gray-400">{tFee('enterPriceToSee')}</p>
          )}
          <p className="text-gray-500 border-t border-blue-100 pt-2">
            <span className="font-medium text-orange-600">{tFee('cancelPolicyLabel')}</span><br />
            {tFee('cancelPolicy72h')}<br />
            {tFee('cancelPolicy24to72h')}<br />
            <span className="text-gray-400">{tFee('cancelPolicyNote')}</span>
          </p>
        </div>
      </div>

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
        <Button type="submit" isLoading={isLoading}>
          {sessionId ? t('common.save') : t('session.create')}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
