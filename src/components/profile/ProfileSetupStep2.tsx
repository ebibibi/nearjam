'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const COMMON_INSTRUMENTS = ['Guitar', 'Bass', 'Drums', 'Keys / Piano', 'Vocals', 'Sax', 'Trumpet', 'Violin', 'Other'];
const COMMON_GENRES = ['Jazz', 'Blues', 'Rock', 'Pop', 'Funk', 'Soul', 'Latin', 'Bossa Nova', 'Classical'];

interface StepProps {
  data: {
    instruments: { instrument: string; proficiency: string }[];
    genres: string[];
  };
  onChange: (patch: {
    instruments?: { instrument: string; proficiency: string }[];
    genres?: string[];
  }) => void;
}

export function ProfileSetupStep2({ data, onChange }: StepProps) {
  const t = useTranslations('profile');
  const [customInstrument, setCustomInstrument] = useState('');
  const [customGenre, setCustomGenre] = useState('');

  function toggleInstrument(instrument: string) {
    const existing = data.instruments.find((i) => i.instrument === instrument);
    if (existing) {
      onChange({ instruments: data.instruments.filter((i) => i.instrument !== instrument) });
    } else {
      onChange({ instruments: [...data.instruments, { instrument, proficiency: '' }] });
    }
  }

  function addCustomInstrument() {
    const v = customInstrument.trim();
    if (v && !data.instruments.find((i) => i.instrument === v)) {
      onChange({ instruments: [...data.instruments, { instrument: v, proficiency: '' }] });
    }
    setCustomInstrument('');
  }

  function toggleGenre(genre: string) {
    if (data.genres.includes(genre)) {
      onChange({ genres: data.genres.filter((g) => g !== genre) });
    } else {
      onChange({ genres: [...data.genres, genre] });
    }
  }

  function addCustomGenre() {
    const v = customGenre.trim();
    if (v && !data.genres.includes(v)) {
      onChange({ genres: [...data.genres, v] });
    }
    setCustomGenre('');
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">{t('setup.step2Title')}</h2>

      {/* Instruments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('instruments')}</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {COMMON_INSTRUMENTS.map((inst) => {
            const selected = !!data.instruments.find((i) => i.instrument === inst);
            return (
              <button
                key={inst}
                type="button"
                onClick={() => toggleInstrument(inst)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selected
                    ? 'border-violet-600 bg-violet-600 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-violet-400'
                }`}
              >
                {inst}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Input
            value={customInstrument}
            onChange={(e) => setCustomInstrument(e.target.value)}
            placeholder="Other instrument..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomInstrument(); } }}
          />
          <Button type="button" variant="secondary" onClick={addCustomInstrument}>+</Button>
        </div>
        {data.instruments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {data.instruments.map((i) => (
              <span key={i.instrument} className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-xs">
                {i.instrument}
                <button type="button" onClick={() => toggleInstrument(i.instrument)} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Genres */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('genres')}</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {COMMON_GENRES.map((genre) => {
            const selected = data.genres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selected
                    ? 'border-violet-600 bg-violet-600 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-violet-400'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Input
            value={customGenre}
            onChange={(e) => setCustomGenre(e.target.value)}
            placeholder="Other genre..."
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomGenre(); } }}
          />
          <Button type="button" variant="secondary" onClick={addCustomGenre}>+</Button>
        </div>
        {data.genres.filter((g) => !COMMON_GENRES.includes(g)).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {data.genres.filter((g) => !COMMON_GENRES.includes(g)).map((g) => (
              <span key={g} className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-xs">
                {g}
                <button type="button" onClick={() => toggleGenre(g)} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
