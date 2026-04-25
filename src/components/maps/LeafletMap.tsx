'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [35.6762, 139.6503];
const DEFAULT_ZOOM = 11;

function createIcon(type: 'venue' | 'studio') {
  const color = type === 'venue' ? '#7c3aed' : '#0891b2';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z" fill="${color}"/>
    <circle cx="14" cy="14" r="7" fill="white"/>
    <circle cx="14" cy="14" r="4" fill="${color}"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
}

const venueIcon = createIcon('venue');
const studioIcon = createIcon('studio');

interface Place {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  type: 'venue' | 'studio';
  link: string;
}

interface LeafletMapProps {
  places: Place[];
  center?: [number, number];
}

export function LeafletMap({ places, center }: LeafletMapProps) {
  const validPlaces = places.filter((p): p is Place & { lat: number; lng: number } => p.lat != null && p.lng != null);

  const mapCenter = center ?? (validPlaces.length > 0
    ? [
        validPlaces.reduce((sum, p) => sum + p.lat, 0) / validPlaces.length,
        validPlaces.reduce((sum, p) => sum + p.lng, 0) / validPlaces.length,
      ] as [number, number]
    : DEFAULT_CENTER);

  return (
    <MapContainer
      center={mapCenter}
      zoom={DEFAULT_ZOOM}
      style={{ width: '100%', height: '400px' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {validPlaces.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={place.type === 'venue' ? venueIcon : studioIcon}
        >
          <Popup>
            <div className="text-center">
              <p className="font-medium text-sm">{place.name}</p>
              <a href={place.link} className="text-xs text-violet-600 hover:underline">
                詳細を見る →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
