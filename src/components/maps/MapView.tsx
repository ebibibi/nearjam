'use client';

import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { useState } from 'react';

const LeafletMap = dynamic(
  () => import('./LeafletMap').then((mod) => mod.LeafletMap),
  { ssr: false, loading: () => <div className="flex items-center justify-center rounded-lg bg-gray-100 h-[400px]"><p className="text-sm text-gray-400">Loading map...</p></div> }
);

const MAP_CONTAINER_STYLE = { width: '100%', height: '400px' };
const DEFAULT_CENTER = { lat: 35.6762, lng: 139.6503 };

interface Place {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  type: 'venue' | 'studio';
  link: string;
}

interface MapViewProps {
  places: Place[];
  center?: { lat: number; lng: number };
}

export function MapView({ places, center = DEFAULT_CENTER }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  if (!apiKey) {
    return <LeafletMap places={places} />;
  }

  return <GoogleMapView places={places} center={center} />;
}

function GoogleMapView({ places, center = DEFAULT_CENTER }: MapViewProps) {
  const t = useTranslations('maps');
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  });

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-gray-100 h-40">
        <p className="text-sm text-gray-400">{t('loading')}</p>
      </div>
    );
  }

  const validPlaces = places.filter((p) => p.lat != null && p.lng != null);

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={center}
      zoom={13}
      options={{ streetViewControl: false, mapTypeControl: false }}
    >
      {validPlaces.map((place) => (
        <Marker
          key={place.id}
          position={{ lat: place.lat!, lng: place.lng! }}
          onClick={() => setSelectedPlace(place)}
          icon={{
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${place.type === 'venue' ? '#7c3aed' : '#0891b2'}"><circle cx="12" cy="10" r="6"/><path d="M12 24 L6 12 L18 12 Z"/></svg>`
            )}`,
            scaledSize: new window.google.maps.Size(24, 24),
          }}
        />
      ))}

      {selectedPlace && selectedPlace.lat != null && selectedPlace.lng != null && (
        <InfoWindow
          position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
          onCloseClick={() => setSelectedPlace(null)}
        >
          <div className="p-1">
            <p className="font-medium text-sm">{selectedPlace.name}</p>
            <a
              href={selectedPlace.link}
              className="text-xs text-violet-600 hover:underline"
            >
              {t('viewMap')} →
            </a>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
