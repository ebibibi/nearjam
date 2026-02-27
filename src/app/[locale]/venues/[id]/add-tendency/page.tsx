import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TendencyForm } from '@/components/tendency/TendencyForm';

export default async function AddTendencyPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const session = await auth();
  if (!session?.user) {
    redirect(`/${locale}/auth/signin`);
  }

  const venue = await prisma.venue.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!venue) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/${locale}/venues/${id}`}
          className="text-sm text-violet-600 hover:underline mb-2 inline-block"
        >
          ← {venue.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('venue.addTendency')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('venue.sessionTendencies')} — {venue.name}
        </p>
      </div>
      <TendencyForm venueId={id} locale={locale} />
    </div>
  );
}
