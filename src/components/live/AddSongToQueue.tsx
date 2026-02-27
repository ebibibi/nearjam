'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface Song {
  id: string;
  title: string;
  artist: string | null;
}

interface AddSongToQueueProps {
  sessionId: string;
  onAdded: () => void;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function AddSongToQueue({ sessionId, onAdded }: AddSongToQueueProps) {
  const t = useTranslations('live');
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [selected, setSelected] = useState<Song | null>(null);
  const [keyOverride, setKeyOverride] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { data: results, isLoading } = useSWR<Song[]>(
    debouncedQ.length >= 2 ? `/api/v1/songs?q=${encodeURIComponent(debouncedQ)}&limit=5` : null,
    fetcher
  );

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => setDebouncedQ(val), 300);
    setTimer(t);
  }

  async function handleAdd() {
    if (!selected) return;
    setIsAdding(true);
    await fetch(`/api/v1/sessions/${sessionId}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId: selected.id, keyOverride: keyOverride || undefined }),
    });
    setSelected(null);
    setQuery('');
    setDebouncedQ('');
    setKeyOverride('');
    setIsAdding(false);
    onAdded();
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          value={selected ? `${selected.title}${selected.artist ? ` — ${selected.artist}` : ''}` : query}
          onChange={handleQueryChange}
          placeholder={t('addToQueue')}
        />
        {isLoading && (
          <div className="absolute right-2 top-2">
            <Spinner className="h-4 w-4" />
          </div>
        )}
      </div>

      {!selected && results && results.length > 0 && (
        <div className="rounded-md border border-gray-200 bg-white shadow-sm divide-y">
          {results.map((song) => (
            <button
              key={song.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-violet-50 text-sm"
              onClick={() => { setSelected(song); setQuery(''); }}
            >
              <span className="font-medium">{song.title}</span>
              {song.artist && <span className="text-gray-500"> — {song.artist}</span>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="flex gap-2">
          <Input
            value={keyOverride}
            onChange={(e) => setKeyOverride(e.target.value)}
            placeholder="Key (optional, e.g. Bb)"
            className="w-32"
          />
          <Button onClick={handleAdd} isLoading={isAdding}>
            + {t('addToQueue')}
          </Button>
          <Button variant="ghost" onClick={() => setSelected(null)}>✕</Button>
        </div>
      )}
    </div>
  );
}
