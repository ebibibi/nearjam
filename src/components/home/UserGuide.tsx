import { getTranslations } from 'next-intl/server';
import { getLocale } from 'next-intl/server';
import Link from 'next/link';

interface GuideCardProps {
  icon: string;
  label: string;
  items: readonly string[];
  cta: string;
  href: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
}

function GuideCard({ icon, label, items, cta, href, accentColor, accentBg, accentBorder }: GuideCardProps) {
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

export async function UserGuide() {
  const t = await getTranslations('home.guide');
  const locale = await getLocale();

  const cards: Omit<GuideCardProps, 'icon' | 'label' | 'items' | 'cta'>[] = [
    {
      href: `/${locale}/venues`,
      accentColor: 'text-violet-700',
      accentBg: 'bg-violet-50',
      accentBorder: 'border-violet-200',
    },
    {
      href: `/${locale}/venues/new`,
      accentColor: 'text-emerald-700',
      accentBg: 'bg-emerald-50',
      accentBorder: 'border-emerald-200',
    },
    {
      href: `/${locale}/venues?level=beginner`,
      accentColor: 'text-amber-700',
      accentBg: 'bg-amber-50',
      accentBorder: 'border-amber-200',
    },
  ];

  const keys = ['musician', 'venue', 'newcomer'] as const;

  return (
    <section>
      <h2 className="mb-5 text-center text-lg font-bold text-gray-900">
        {t('title')}
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {keys.map((key, i) => (
          <GuideCard
            key={key}
            icon={t(`${key}.icon`)}
            label={t(`${key}.label`)}
            items={[
              t(`${key}.items.0`),
              t(`${key}.items.1`),
              t(`${key}.items.2`),
              t(`${key}.items.3`),
            ]}
            cta={t(`${key}.cta`)}
            {...cards[i]}
          />
        ))}
      </div>
    </section>
  );
}
