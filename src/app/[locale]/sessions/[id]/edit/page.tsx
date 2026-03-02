export const dynamic = 'force-dynamic';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'session' });
  return { title: `${t('edit')} — NearJam` };
}
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SessionForm } from '@/components/session/SessionForm';

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const [authSession, session, venues, studios] = await Promise.all([
    auth(),
    prisma.jamSession.findUnique({
      where: { id },
      select: {
        id: true,
        sessionAdminId: true,
        title: true,
        venueId: true,
        studioId: true,
        startsAt: true,
        durationMinutes: true,
        format: true,
        isSyncroom: true,
        moodFlags: true,
        maxParticipants: true,
        registrationRequired: true,
        description: true,
      },
    }),
    prisma.venue.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.studio.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);

  if (!session) notFound();
  if (!authSession?.user) redirect(`/${locale}/auth/signin`);
  if (session.sessionAdminId !== authSession.user.id) {
    redirect(`/${locale}/sessions/${id}`);
  }

  const initialValues = {
    title: session.title,
    venueId: session.venueId ?? '',
    studioId: session.studioId ?? '',
    // datetime-local が受け付ける "YYYY-MM-DDTHH:mm" 形式に変換
    startsAt: new Date(session.startsAt).toISOString().slice(0, 16),
    durationMinutes: session.durationMinutes?.toString() ?? '',
    format: session.format,
    isSyncroom: session.isSyncroom,
    maxParticipants: session.maxParticipants?.toString() ?? '',
    registrationRequired: session.registrationRequired,
    description: session.description ?? '',
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${locale}/sessions/${id}`}
          className="text-sm text-violet-600 hover:underline mb-2 inline-block"
        >
          ← {t('session.backToDetail')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('session.edit')}</h1>
      </div>
      <SessionForm
        locale={locale}
        venues={venues}
        studios={studios}
        sessionId={id}
        initialValues={initialValues}
        initialMoodFlags={session.moodFlags}
      />
    </div>
  );
}
