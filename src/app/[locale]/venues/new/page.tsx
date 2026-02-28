export const dynamic = 'force-dynamic';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { VenueForm } from '@/components/venue/VenueForm';

export default async function NewVenuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${locale}/venues`}
          className="text-sm text-violet-600 hover:underline mb-2 inline-block"
        >
          ← {t('venue.title')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('venue.add')}</h1>
      </div>
      <VenueForm locale={locale} />
    </div>
  );
}
