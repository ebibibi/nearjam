'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

interface TendencyFormProps {
  venueId: string;
  locale: string;
}

export function TendencyForm({ venueId, locale }: TendencyFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genreInput, setGenreInput] = useState('');
  const [genres, setGenres] = useState<string[]>([]);

  const [values, setValues] = useState({
    name: '',
    typicalDayOfWeek: '',
    typicalStartTime: '',
    typicalEndTime: '',
    atmosphere: '',
    levelRange: '',
    entrySystem: '',
    capacity: '',
    houseEquipment: '',
  });

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((prev) => ({ ...prev, [field]: e.target.value }));

  function addGenre() {
    const g = genreInput.trim();
    if (g && !genres.includes(g)) {
      setGenres((prev) => [...prev, g]);
    }
    setGenreInput('');
  }

  function removeGenre(g: string) {
    setGenres((prev) => prev.filter((x) => x !== g));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const body = {
      name: values.name,
      typicalDayOfWeek: values.typicalDayOfWeek !== '' ? parseInt(values.typicalDayOfWeek, 10) : undefined,
      typicalStartTime: values.typicalStartTime || undefined,
      typicalEndTime: values.typicalEndTime || undefined,
      genres,
      atmosphere: values.atmosphere || undefined,
      levelRange: values.levelRange || undefined,
      entrySystem: values.entrySystem || undefined,
      capacity: values.capacity ? parseInt(values.capacity, 10) : undefined,
      houseEquipment: values.houseEquipment || undefined,
    };

    const res = await fetch(`/api/v1/venues/${venueId}/tendencies`, {
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

    router.push(`/${locale}/venues/${venueId}`);
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
          {t('tendency.name')} <span className="text-red-500">*</span>
        </label>
        <Input
          value={values.name}
          onChange={set('name')}
          placeholder={t('tendency.namePlaceholder')}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('tendency.typicalDay')}
          </label>
          <Select value={values.typicalDayOfWeek} onChange={set('typicalDayOfWeek')}>
            <option value="">—</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {t(`tendency.days.${d}`)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('tendency.startTime')}
          </label>
          <Input type="time" value={values.typicalStartTime} onChange={set('typicalStartTime')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('tendency.endTime')}
          </label>
          <Input type="time" value={values.typicalEndTime} onChange={set('typicalEndTime')} />
        </div>
      </div>

      {/* Genres */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('song.genre')}
        </label>
        <div className="flex gap-2">
          <Input
            value={genreInput}
            onChange={(e) => setGenreInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addGenre(); }
            }}
            placeholder="Jazz, Blues..."
          />
          <Button type="button" variant="secondary" onClick={addGenre}>+</Button>
        </div>
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {genres.map((g) => (
              <span
                key={g}
                className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-xs"
              >
                {g}
                <button type="button" onClick={() => removeGenre(g)} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('tendency.levelRange')}
        </label>
        <Input value={values.levelRange} onChange={set('levelRange')} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('tendency.entrySystem')}
        </label>
        <Input
          value={values.entrySystem}
          onChange={set('entrySystem')}
          placeholder={t('tendency.entrySystemPlaceholder')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('tendency.capacity')}
          </label>
          <Input type="number" value={values.capacity} onChange={set('capacity')} min={1} max={500} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('tendency.equipment')}
          </label>
          <Input value={values.houseEquipment} onChange={set('houseEquipment')} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('tendency.atmosphere')}
        </label>
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[80px]"
          value={values.atmosphere}
          onChange={set('atmosphere')}
          placeholder={t('tendency.atmospherePlaceholder')}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" isLoading={isLoading}>
          {t('common.submit')}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}
