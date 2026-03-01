import { getTranslations } from 'next-intl/server';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function KudosInboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  const t = await getTranslations('kudos');
  const userId = session.user.id;

  const kudos = await prisma.kudos.findMany({
    where: { toUserId: userId },
    include: {
      fromUser: { select: { id: true, nickname: true, image: true } },
      jamSession: { select: { id: true, title: true, startsAt: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('inbox')}</h1>

      {kudos.length === 0 ? (
        <p className="text-gray-400 text-center py-12">{t('noKudos')}</p>
      ) : (
        <div className="space-y-3">
          {kudos.map((k) => (
            <div key={k.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 bg-white">
              <div className="text-3xl">{k.stamp}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {k.fromUser.nickname ?? '匿名'}
                </p>
                {k.message && (
                  <p className="text-sm text-gray-700 mt-1 italic">"{k.message}"</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {k.jamSession.title} · {new Date(k.jamSession.startsAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
