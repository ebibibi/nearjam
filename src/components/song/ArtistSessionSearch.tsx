'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import useSWR from 'swr';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

const DOW_LABELS_JA = ['日', '月', '火', '水', '木', '金', '土'];
const DOW_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fetcher(url: string) {
  return fetch(url).then((r) => r.json());
}

interface TendencyResult {
  id: string;
  name: string;
  typicalDayOfWeek: number | null;
  typicalStartTime: string | null;
  typicalEndTime: string | null;
  genres: string[];
  levelRange: string | null;
  entrySystem: string | null;
  typicalArtists: string[];
  typicalSongs: string[];
  sourceUrl: string | null;
  venue: {
    id: string;
    name: string;
    nearestStation: string | null;
    walkMinutes: number | null;
    websiteUrl: string | null;
  };
}

interface ArtistSessionSearchProps {
  popularArtists: string[];
}

export function ArtistSessionSearch({ popularArtists }: ArtistSessionSearchProps) {
  const t = useTranslations('song');
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dowLabels = locale === 'ja' ? DOW_LABELS_JA : DOW_LABELS_EN;

  function handleQueryChange(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(value), 400);
  }

  function handleTagClick(artist: string) {
    setQuery(artist);
    setDebouncedQuery(artist);
  }

  const url = debouncedQuery.length >= 2
    ? `/api/v1/tendencies/search?q=${encodeURIComponent(debouncedQuery)}`
    : null;
  const { data, isLoading } = useSWR<TendencyResult[]>(url, fetcher);

  return (
    <div className="space-y-6">
      {/* Search input */}
      <Input
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder={t('artistSearchPlaceholder')}
      />

      {/* Popular artist tags */}
      {popularArtists.length > 0 && !debouncedQuery && (
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">{t('popularArtists')}</p>
          <div className="flex flex-wrap gap-2">
            {popularArtists.map((artist) => (
              <button
                key={artist}
                type="button"
                onClick={() => handleTagClick(artist)}
                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100"
              >
                {artist}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-8"><Spinner /></div>
      )}

      {/* Results */}
      {data && data.length === 0 && debouncedQuery && (
        <p className="py-4 text-center text-sm text-gray-500">{t('noMatchingSessions')}</p>
      )}

      {data && data.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {data.length}{t('matchingSessionsCount')}
          </p>
          {data.map((tendency) => {
            const sourceLink = tendency.sourceUrl || tendency.venue.websiteUrl;
            return (
              <div key={tendency.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{tendency.name}</h3>
                    <p className="mt-0.5 text-sm text-gray-600">
                      📍{' '}
                      <Link
                        href={`/${locale}/venues/${tendency.venue.id}`}
                        className="text-violet-600 hover:underline"
                      >
                        {tendency.venue.name}
                      </Link>
                      {tendency.venue.nearestStation && (
                        <span className="text-gray-400">
                          {' '}({tendency.venue.nearestStation}
                          {tendency.venue.walkMinutes ? ` ${tendency.venue.walkMinutes}分` : ''})
                        </span>
                      )}
                    </p>

                    {/* Day / Time */}
                    {tendency.typicalDayOfWeek != null && (
                      <p className="mt-1 text-sm text-gray-500">
                        📅 {locale === 'ja' ? '毎週' : 'Every '}{dowLabels[tendency.typicalDayOfWeek]}
                        {tendency.typicalStartTime && ` ${tendency.typicalStartTime}`}
                        {tendency.typicalEndTime && `〜${tendency.typicalEndTime}`}
                      </p>
                    )}

                    {/* Genres */}
                    {tendency.genres.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tendency.genres.map((g) => (
                          <span key={g} className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">{g}</span>
                        ))}
                      </div>
                    )}

                    {/* Matched artists/songs highlight */}
                    {tendency.typicalArtists.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        🎤 {tendency.typicalArtists.join(', ')}
                      </p>
                    )}

                    {/* Level / Entry */}
                    <div className="mt-1 flex gap-2 text-xs text-gray-400">
                      {tendency.levelRange && <span>{tendency.levelRange}</span>}
                      {tendency.entrySystem && <span>{tendency.entrySystem}</span>}
                    </div>
                  </div>

                  {/* Source URL — always visible, always prominent */}
                  {sourceLink && (
                    <a
                      href={sourceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-opacity hover:opacity-80"
                    >
                      🌐 {t('verifySource')}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
