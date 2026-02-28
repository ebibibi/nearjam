export const dynamic = 'force-dynamic';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/Button';
import { VenueCard } from '@/components/venue/VenueCard';

export default async function VenuesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const venues = await prisma.venue.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      tendencies: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 2,
        select: { name: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('venue.title')}</h1>
        <Link href={`/${locale}/venues/new`}>
          <Button size="sm">{t('venue.add')}</Button>
        </Link>
      </div>

      {venues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500 mb-4">{t('common.noResults')}</p>
          <Link href={`/${locale}/venues/new`}>
            <Button variant="secondary">{t('venue.add')}</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
