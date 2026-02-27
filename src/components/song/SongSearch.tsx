'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { Input } from '@/components/ui/Input';
import { SongCard } from './SongCard';
import { WishlistButton } from './WishlistButton';
import { Spinner } from '@/components/ui/Spinner';

function fetcher(url: string) {
  return fetch(url).then((r) => r.json());
}

interface SongSearchProps {
  isSignedIn?: boolean;
  wishlistIds?: Set<string>;
}

export function SongSearch({ isSignedIn = false, wishlistIds = new Set() }: SongSearchProps) {
  const t = useTranslations('song');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);
      if (timer) clearTimeout(timer);
      const t = setTimeout(() => setDebouncedQuery(value), 400);
      setTimer(t);
    },
    [timer]
  );

  const url = `/api/v1/songs?limit=20${debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : ''}`;
  const { data, isLoading } = useSWR<{ id: string; title: string; artist: string | null; genre: string | null; typicalKey: string | null; typicalBpmMin: number | null; typicalBpmMax: number | null; difficulty: string; wishlistCount: number }[]>(
    isSignedIn ? url : null,
    fetcher
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          value={query}
          onChange={handleQueryChange}
          placeholder={t('searchPlaceholder')}
        />
      </div>

      {!isSignedIn && (
        <p className="text-sm text-gray-500">{t('signInToWishlist')}</p>
      )}

      {isLoading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {data && data.length === 0 && (
        <p className="text-sm text-gray-500 py-4 text-center">{t('noSongs')}</p>
      )}

      {data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              action={
                <WishlistButton
                  songId={song.id}
                  initialInWishlist={wishlistIds.has(song.id)}
                  isSignedIn={isSignedIn}
                />
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
