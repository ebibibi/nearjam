export const dynamic = 'force-dynamic';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ConnectionActions } from '@/components/connection/ConnectionActions';
import { BlockButton } from '@/components/user/BlockButton';

export default async function ConnectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('connection');

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin`);
  }
  const userId = session.user.id;

  const [sent, received, blocks] = await Promise.all([
    prisma.connection.findMany({
      where: { fromUserId: userId },
      include: {
        toUser: { select: { id: true, nickname: true, image: true } },
      },
      orderBy: { requestedAt: 'desc' },
    }),
    prisma.connection.findMany({
      where: { toUserId: userId, status: 'PENDING' },
      include: {
        fromUser: { select: { id: true, nickname: true, image: true } },
      },
      orderBy: { requestedAt: 'desc' },
    }),
    prisma.block.findMany({
      where: { blockerUserId: userId },
      select: { blockedUserId: true, blocked: { select: { id: true, nickname: true } } },
    }),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link href={`/${locale}/profile`} className="text-sm text-violet-600 hover:underline mb-2 inline-block">
          ← {t('backToProfile')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      </div>

      {/* 受信した申請（承認待ち） */}
      {received.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('pendingRequests')}</h2>
          <div className="space-y-3">
            {received.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  {conn.fromUser.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={conn.fromUser.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {conn.fromUser.nickname ?? t('anonymous')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ConnectionActions connectionId={conn.id} mode="received" />
                  <BlockButton targetUserId={conn.fromUser.id} isBlocked={false} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 送信した申請 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('myConnections')}</h2>
        {sent.length === 0 ? (
          <p className="text-sm text-gray-400">{t('noConnections')}</p>
        ) : (
          <div className="space-y-3">
            {sent.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  {conn.toUser.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={conn.toUser.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {conn.toUser.nickname ?? t('anonymous')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {conn.status === 'ACCEPTED'
                        ? t('statusAccepted')
                        : conn.status === 'REJECTED'
                          ? t('statusRejected')
                          : t('statusPending')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conn.status === 'PENDING' && (
                    <ConnectionActions connectionId={conn.id} mode="sent" />
                  )}
                  <BlockButton targetUserId={conn.toUser.id} isBlocked={false} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ブロックリスト */}
      {blocks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('blockedUsers')}</h2>
          <div className="space-y-2">
            {blocks.map((b) => (
              <div key={b.blockedUserId} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-600">
                  {b.blocked.nickname ?? t('anonymous')}
                </span>
                <BlockButton targetUserId={b.blockedUserId} isBlocked={true} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
