export const dynamic = 'force-dynamic';
import { setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LiveSessionDashboard } from '@/components/live/LiveSessionDashboard';
import { getTranslations } from 'next-intl/server';

export default async function LiveSessionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin`);
  }

  const jamSession = await prisma.jamSession.findUnique({
    where: { id },
    select: { id: true, title: true, sessionAdminId: true },
  });

  if (!jamSession) notFound();

  if (jamSession.sessionAdminId !== session.user.id) {
    redirect(`/${locale}/sessions/${id}`);
  }

  return (
    <div className="max-w-2xl">
      <Link
        href={`/${locale}/sessions/${id}`}
        className="text-sm text-violet-600 hover:underline mb-4 inline-block"
      >
        ← {t('session.title')}
      </Link>
      <LiveSessionDashboard sessionId={id} sessionTitle={jamSession.title} />
    </div>
  );
}
