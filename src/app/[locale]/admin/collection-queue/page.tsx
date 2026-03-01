import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CollectionQueueActions } from '@/components/admin/CollectionQueueActions';

export default async function CollectionQueuePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== 'ADMIN') redirect('/');

  const t = await getTranslations('admin');

  const tendencies = await prisma.sessionTendency.findMany({
    where: { isActive: false, sourceType: 'AUTO_COLLECTED' },
    include: { venue: { select: { id: true, name: true, address: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('collectionQueue')}</h1>

      {tendencies.length === 0 ? (
        <p className="text-gray-400 text-center py-12">{t('noItems')}</p>
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
                      <span>🗓 {['日', '月', '火', '水', '木', '金', '土'][tendency.typicalDayOfWeek]}曜</span>
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
