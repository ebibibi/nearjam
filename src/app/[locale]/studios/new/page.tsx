import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { StudioForm } from '@/components/studio/StudioForm';

export default async function NewStudioPage({
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
          href={`/${locale}/studios`}
          className="text-sm text-violet-600 hover:underline mb-2 inline-block"
        >
          ← {t('studio.title')}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{t('studio.add')}</h1>
      </div>
      <StudioForm locale={locale} />
    </div>
  );
}
