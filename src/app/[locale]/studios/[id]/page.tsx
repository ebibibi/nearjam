import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/Badge';
import { RoomList } from '@/components/studio/RoomList';
import { Button } from '@/components/ui/Button';

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

  const maps = studio.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`
    : null;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link
          href={`/${locale}/studios`}
          className="text-sm text-violet-600 hover:underline mb-3 inline-block"
        >
          ← {t('studio.title')}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">{studio.name}</h1>
          {studio.verifiedAt ? (
            <Badge variant="verified">✅ {t('venue.verified')}</Badge>
          ) : (
            <Badge variant="unverified">⚠️ {t('venue.unverified')}</Badge>
          )}
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
