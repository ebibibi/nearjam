import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { VerificationBadge } from '@/components/venue/VerificationBadge';
import { SessionTendencyCard } from '@/components/venue/SessionTendencyCard';
import { Button } from '@/components/ui/Button';

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const venue = await prisma.venue.findUnique({
    where: { id },
    include: {
      tendencies: {
        where: { isActive: true },
        orderBy: [{ sourceType: 'asc' }, { createdAt: 'desc' }],
        include: { sourceUser: { select: { nickname: true } } },
      },
    },
  });

  if (!venue) notFound();

  const maps = venue.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`
    : null;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Back + header */}
      <div>
        <Link
          href={`/${locale}/venues`}
          className="text-sm text-violet-600 hover:underline mb-3 inline-block"
        >
          ← {t('venue.title')}
        </Link>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-gray-900">{venue.name}</h1>
          <VerificationBadge verifiedAt={venue.verifiedAt} disputedAt={venue.disputedAt} />
        </div>

        {venue.verifiedAt == null && (
          <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {t('venue.unverifiedNotice')}
          </p>
        )}
      </div>

      {/* Info grid */}
      <div className="grid gap-3 sm:grid-cols-2 text-sm text-gray-700">
        {venue.address && (
          <div>
            <span className="font-medium">📍 {t('venue.address')}</span>
            <p className="mt-0.5 text-gray-600">{venue.address}</p>
          </div>
        )}
        {venue.nearestStation && (
          <div>
            <span className="font-medium">🚉 {t('venue.nearestStation')}</span>
            <p className="mt-0.5 text-gray-600">
              {venue.nearestStation}
              {venue.walkMinutes != null && ` (${venue.walkMinutes}${t('common.minutes')})`}
            </p>
          </div>
        )}
        {venue.websiteUrl && (
          <div>
            <span className="font-medium">🌐 {t('venue.website')}</span>
            <p className="mt-0.5">
              <a
                href={venue.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:underline break-all"
              >
                {venue.websiteUrl}
              </a>
            </p>
          </div>
        )}
        {venue.instagramUrl && (
          <div>
            <span className="font-medium">📸 {t('venue.instagram')}</span>
            <p className="mt-0.5">
              <a href={venue.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
                Instagram
              </a>
            </p>
          </div>
        )}
        {venue.xUrl && (
          <div>
            <span className="font-medium">🐦 {t('venue.twitter')}</span>
            <p className="mt-0.5">
              <a href={venue.xUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
                X / Twitter
              </a>
            </p>
          </div>
        )}
        {venue.bookingPhone && (
          <div>
            <span className="font-medium">📞 {t('venue.phone')}</span>
            <p className="mt-0.5 text-gray-600">{venue.bookingPhone}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {maps && (
          <a href={maps} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm">📍 {t('venue.directions')}</Button>
          </a>
        )}
        {venue.bookingUrl && (
          <a href={venue.bookingUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm">📅 {t('venue.booking')}</Button>
          </a>
        )}
      </div>

      {/* House Rules */}
      {venue.rulesMarkdown && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t('venue.rulesPage')}</h2>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
            {venue.rulesMarkdown}
          </div>
        </section>
      )}

      {/* Session Tendencies */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('venue.sessionTendencies')}</h2>
          <Link href={`/${locale}/venues/${id}/add-tendency`}>
            <Button variant="secondary" size="sm">{t('venue.addTendency')}</Button>
          </Link>
        </div>

        {venue.tendencies.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-8 text-center">
            <p className="text-gray-500 text-sm mb-3">{t('venue.noTendencies')}</p>
            <Link href={`/${locale}/venues/${id}/add-tendency`}>
              <Button variant="secondary" size="sm">{t('venue.addTendency')}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {venue.tendencies.map((tendency) => (
              <SessionTendencyCard key={tendency.id} tendency={tendency} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
