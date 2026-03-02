export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/Badge';
import { RoomList } from '@/components/studio/RoomList';
import { Button } from '@/components/ui/Button';
import { ShareButton } from '@/components/session/ShareButton';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale });
  const studio = await prisma.studio.findUnique({
    where: { id },
    select: { name: true, address: true, nearestStation: true, rooms: { select: { name: true }, take: 3 } },
  });
  if (!studio) return {};

  const descParts = [
    t('studio.meta.detailDesc', { name: studio.name }),
    studio.nearestStation ? t('studio.meta.nearStation', { station: studio.nearestStation }) : '',
    studio.rooms.length > 0 ? t('studio.meta.roomCount', { n: studio.rooms.length }) : '',
    t('studio.meta.ctaBook'),
  ].filter(Boolean).join(' ');

  const title = t('studio.meta.detailTitle', { name: studio.name });

  return {
    title,
    description: descParts.slice(0, 160),
    openGraph: {
      title: `${studio.name} | NearJam`,
      description: descParts.slice(0, 160),
    },
  };
}

export default async function StudioDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const studio = await prisma.studio.findUnique({
    where: { id },
    include: {
      rooms: { orderBy: { name: 'asc' } },
    },
  });

  if (!studio) notFound();

  const mapsDestination =
    studio.lat != null && studio.lng != null
      ? `${studio.lat},${studio.lng}`
      : studio.address
        ? encodeURIComponent(studio.address)
        : null;
  const maps = mapsDestination
    ? `https://www.google.com/maps/dir/?api=1&destination=${mapsDestination}`
    : null;

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nearjam.app';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicVenue',
    name: studio.name,
    ...(studio.address ? { address: { '@type': 'PostalAddress', streetAddress: studio.address } } : {}),
    ...(studio.lat != null && studio.lng != null ? { geo: { '@type': 'GeoCoordinates', latitude: studio.lat, longitude: studio.lng } } : {}),
    url: `${BASE_URL}/${locale}/studios/${id}`,
  };
  // JSON.stringify escapes HTML chars (<, >, &) so dangerouslySetInnerHTML is safe for structured data
  const jsonLdString = JSON.stringify(jsonLd);

  return (
    <div className="max-w-3xl space-y-8">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString }} />
      <div>
        <Link
          href={`/${locale}/studios`}
          className="text-sm text-violet-600 hover:underline mb-3 inline-block"
        >
          ← {t('studio.title')}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">{studio.name}</h1>
          <div className="flex items-center gap-2">
            {studio.verifiedAt ? (
              <Badge variant="verified">✅ {t('venue.verified')}</Badge>
            ) : (
              <Badge variant="unverified">⚠️ {t('venue.unverified')}</Badge>
            )}
            <ShareButton
              title={studio.name}
              url={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://nearjam.app'}/${locale}/studios/${id}`}
            />
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-700">
        {studio.address && (
          <div>
            <span className="font-medium">📍 {t('studio.address')}</span>
            <p className="mt-0.5 text-gray-600">{studio.address}</p>
          </div>
        )}
        {studio.nearestStation && (
          <div>
            <span className="font-medium">🚉 {t('studio.nearestStation')}</span>
            <p className="mt-0.5 text-gray-600">
              {studio.nearestStation}
              {studio.walkMinutes != null && ` (${studio.walkMinutes}${t('common.minutes')})`}
            </p>
          </div>
        )}
        {studio.openingHours && (
          <div>
            <span className="font-medium">🕐 {t('studio.openingHours')}</span>
            <p className="mt-0.5 text-gray-600">{studio.openingHours}</p>
          </div>
        )}
        {studio.bookingMethod && (
          <div>
            <span className="font-medium">📅 {t('studio.bookingMethod')}</span>
            <p className="mt-0.5 text-gray-600">
              {t(`studio.bookingMethods.${studio.bookingMethod}`)}
            </p>
          </div>
        )}
        {studio.websiteUrl && (
          <div>
            <span className="font-medium">🌐 {t('studio.website')}</span>
            <p className="mt-0.5">
              <a
                href={studio.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:underline break-all"
              >
                {studio.websiteUrl}
              </a>
            </p>
          </div>
        )}
        {studio.phone && (
          <div>
            <span className="font-medium">📞 {t('studio.phone')}</span>
            <p className="mt-0.5 text-gray-600">{studio.phone}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {maps && (
        <a href={maps} target="_blank" rel="noopener noreferrer">
          <Button variant="secondary" size="sm">📍 {t('studio.directions')}</Button>
        </a>
      )}

      {/* Rooms */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{t('studio.rooms')}</h2>
        <RoomList rooms={studio.rooms} />
      </section>
    </div>
  );
}
