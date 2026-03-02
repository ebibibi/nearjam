import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Collection Queue — NearJam Admin',
  robots: { index: false, follow: false },
};
import { prisma } from '@/lib/prisma';
import { CollectionQueueActions } from '@/components/admin/CollectionQueueActions';

export default async function CollectionQueuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) redirect(`/${locale}/auth/signin`);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') redirect(`/${locale}`);

  const t = await getTranslations({ locale });

  const tendencies = await prisma.sessionTendency.findMany({
    where: { isActive: false, sourceType: 'AUTO_COLLECTED' },
    include: { venue: { select: { id: true, name: true, address: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('admin.collectionQueue')}</h1>

      {tendencies.length === 0 ? (
        <p className="text-gray-400 text-center py-12">{t('admin.noItems')}</p>
      ) : (
        <div className="space-y-4">
          {tendencies.map((tendency) => (
            <div key={tendency.id} className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{tendency.name}</p>
                  <p className="text-sm text-gray-500">{tendency.venue?.name} {tendency.venue?.address && `— ${tendency.venue.address}`}</p>
                  {tendency.sourceUrl && (
                    <a href={tendency.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-violet-500 hover:underline truncate block max-w-xs mt-1">
                      {tendency.sourceUrl}
                    </a>
                  )}
                  <div className="text-xs text-gray-400 mt-1 space-x-3">
                    {tendency.typicalDayOfWeek != null && (
                      <span>🗓 {t('venue.everyDay', { day: t(`tendency.shortDays.${tendency.typicalDayOfWeek}` as Parameters<typeof t>[0]) })}</span>
                    )}
                    {tendency.typicalStartTime && <span>⏰ {tendency.typicalStartTime}</span>}
                    {tendency.genres.length > 0 && <span>🎵 {tendency.genres.join(', ')}</span>}
                    {tendency.levelRange && <span>📊 {tendency.levelRange}</span>}
                  </div>
                </div>
                <CollectionQueueActions tendencyId={tendency.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
