'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { VenueCard } from './VenueCard';
import { MapView } from '@/components/maps/MapView';

interface VenueForList {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  nearestStation: string | null;
  walkMinutes: number | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  xUrl: string | null;
  verifiedAt: Date | null;
  disputedAt: Date | null;
  updatedAt: Date;
  tendencies: {
    name: string;
    typicalDayOfWeek: number | null;
    typicalStartTime: string | null;
    genres: string[];
    entrySystem: string | null;
  }[];
}

interface Props {
  venues: VenueForList[];
  locale: string;
  upcomingCounts: Record<string, number>;
}

export function VenueListOrMap({ venues, locale, upcomingCounts }: Props) {
  const t = useTranslations('venue');
  const [tab, setTab] = useState<'list' | 'map'>('list');

  const places = venues.map((v) => ({
    id: v.id,
    name: v.name,
    lat: v.lat,
    lng: v.lng,
    type: 'venue' as const,
    link: `/${locale}/venues/${v.id}`,
  }));

  return (
    <div>
      {/* タブ切り替え */}
      <div className="mb-4 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        <button
          onClick={() => setTab('list')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'list'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('listView')}
        </button>
        <button
          onClick={() => setTab('map')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === 'map'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t('mapView')}
        </button>
      </div>

      {tab === 'list' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <VenueCard
              key={venue.id}
              venue={venue}
              locale={locale}
              upcomingSessionCount={upcomingCounts[venue.id] ?? 0}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <MapView places={places} />
        </div>
      )}
    </div>
  );
}
