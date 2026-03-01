export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/Button';
import { StudioCard } from '@/components/studio/StudioCard';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const count = await prisma.studio.count();
  const title = t('studio.meta.title');
  const desc = t('studio.meta.desc', { count });
  return {
    title,
    description: desc,
    openGraph: { title: `${title} | NearJam`, description: desc },
  };
}

export default async function StudiosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const studios = await prisma.studio.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      rooms: { select: { id: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('studio.title')}</h1>
        <Link href={`/${locale}/studios/new`}>
          <Button size="sm">{t('studio.add')}</Button>
        </Link>
      </div>

      {studios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500 mb-4">{t('common.noResults')}</p>
          <Link href={`/${locale}/studios/new`}>
            <Button variant="secondary">{t('studio.add')}</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studios.map((studio) => (
            <StudioCard key={studio.id} studio={studio} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
