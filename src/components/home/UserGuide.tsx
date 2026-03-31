import { getTranslations } from 'next-intl/server';
import { getLocale } from 'next-intl/server';
import Link from 'next/link';

interface SimpleCardProps {
  icon: string;
  label: string;
  items: readonly string[];
  cta: string;
  href: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
}

function SimpleCard({ icon, label, items, cta, href, accentColor, accentBg, accentBorder }: SimpleCardProps) {
  return (
    <div className={`flex flex-col rounded-xl border ${accentBorder} bg-white p-5 shadow-sm`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <h3 className={`text-base font-bold ${accentColor}`}>{label}</h3>
      </div>
      <ul className="mb-4 flex-1 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
            <span className={`mt-0.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full ${accentBg}`} />
            {item}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`inline-block rounded-lg ${accentBg} px-4 py-2 text-center text-sm font-semibold ${accentColor} transition-opacity hover:opacity-80`}
      >
        {cta}
      </Link>
    </div>
  );
}

interface UsecaseProps {
  icon: string;
  title: string;
  desc: string;
}

function Usecase({ icon, title, desc }: UsecaseProps) {
  return (
    <div className="flex gap-3">
      <span className="text-xl flex-shrink-0">{icon}</span>
      <div>
        <h4 className="text-sm font-bold text-gray-900">{title}</h4>
        <p className="mt-0.5 text-sm text-gray-600">{desc}</p>
      </div>
    </div>
  );
}

interface MusicianCardProps {
  icon: string;
  label: string;
  usecases: readonly UsecaseProps[];
  cta: string;
  href: string;
}

function MusicianCard({ icon, label, usecases, cta, href }: MusicianCardProps) {
  return (
    <div className="flex flex-col rounded-xl border border-violet-200 bg-white p-5 shadow-sm md:col-span-2">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-base font-bold text-violet-700">{label}</h3>
      </div>
      <div className="mb-4 flex-1 grid gap-4 sm:grid-cols-3">
        {usecases.map((uc, i) => (
          <Usecase key={i} {...uc} />
        ))}
      </div>
      <Link
        href={href}
        className="inline-block self-start rounded-lg bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition-opacity hover:opacity-80"
      >
        {cta}
      </Link>
    </div>
  );
}

export async function UserGuide() {
  const t = await getTranslations('home.guide');
  const locale = await getLocale();

  const usecases: UsecaseProps[] = [
    { icon: t('musician.usecase1.icon'), title: t('musician.usecase1.title'), desc: t('musician.usecase1.desc') },
    { icon: t('musician.usecase2.icon'), title: t('musician.usecase2.title'), desc: t('musician.usecase2.desc') },
    { icon: t('musician.usecase3.icon'), title: t('musician.usecase3.title'), desc: t('musician.usecase3.desc') },
  ];

  return (
    <section>
      <h2 className="mb-5 text-center text-lg font-bold text-gray-900">
        {t('title')}
      </h2>
      <div className="grid gap-4 md:grid-cols-4">
        <MusicianCard
          icon={t('musician.icon')}
          label={t('musician.label')}
          usecases={usecases}
          cta={t('musician.cta')}
          href={`/${locale}/venues`}
        />
        <SimpleCard
          icon={t('venue.icon')}
          label={t('venue.label')}
          items={[
            t('venue.items.0'),
            t('venue.items.1'),
            t('venue.items.2'),
            t('venue.items.3'),
          ]}
          cta={t('venue.cta')}
          href={`/${locale}/venues/new`}
          accentColor="text-emerald-700"
          accentBg="bg-emerald-50"
          accentBorder="border-emerald-200"
        />
        <SimpleCard
          icon={t('newcomer.icon')}
          label={t('newcomer.label')}
          items={[
            t('newcomer.items.0'),
            t('newcomer.items.1'),
            t('newcomer.items.2'),
            t('newcomer.items.3'),
          ]}
          cta={t('newcomer.cta')}
          href={`/${locale}/venues?level=beginner`}
          accentColor="text-amber-700"
          accentBg="bg-amber-50"
          accentBorder="border-amber-200"
        />
      </div>
    </section>
  );
}
