'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface VenueFormProps {
  locale: string;
  initialValues?: {
    name?: string;
    address?: string;
    nearestStation?: string;
    walkMinutes?: number | null;
    websiteUrl?: string | null;
    instagramUrl?: string | null;
    xUrl?: string | null;
    bookingPhone?: string | null;
  };
  venueId?: string;
}

export function VenueForm({ locale, initialValues, venueId }: VenueFormProps) {
  const t = useTranslations('venue');
  const tc = useTranslations('common');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [values, setValues] = useState({
    name: initialValues?.name ?? '',
    address: initialValues?.address ?? '',
    nearestStation: initialValues?.nearestStation ?? '',
    walkMinutes: initialValues?.walkMinutes?.toString() ?? '',
    websiteUrl: initialValues?.websiteUrl ?? '',
    instagramUrl: initialValues?.instagramUrl ?? '',
    xUrl: initialValues?.xUrl ?? '',
    bookingPhone: initialValues?.bookingPhone ?? '',
  });

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const body = {
      name: values.name,
      address: values.address || undefined,
      nearestStation: values.nearestStation || undefined,
      walkMinutes: values.walkMinutes ? parseInt(values.walkMinutes, 10) : undefined,
      websiteUrl: values.websiteUrl || undefined,
      instagramUrl: values.instagramUrl || undefined,
      xUrl: values.xUrl || undefined,
      bookingPhone: values.bookingPhone || undefined,
    };

    const url = venueId ? `/api/v1/venues/${venueId}` : '/api/v1/venues';
    const method = venueId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? tc('error'));
      setIsLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/${locale}/venues/${venueId ?? data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('name')} <span className="text-red-500">*</span>
        </label>
        <Input
          value={values.name}
          onChange={set('name')}
          placeholder={t('namePlaceholder')}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('address')}</label>
        <Input
          value={values.address}
          onChange={set('address')}
          placeholder={t('addressPlaceholder')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('nearestStation')}
          </label>
          <Input
            value={values.nearestStation}
            onChange={set('nearestStation')}
            placeholder={t('nearestStationPlaceholder')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('walkMinutes')}
          </label>
          <Input
            type="number"
            value={values.walkMinutes}
            onChange={set('walkMinutes')}
            min={0}
            max={120}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('website')}</label>
        <Input value={values.websiteUrl} onChange={set('websiteUrl')} type="url" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('instagram')}</label>
        <Input value={values.instagramUrl} onChange={set('instagramUrl')} type="url" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('twitter')}</label>
        <Input value={values.xUrl} onChange={set('xUrl')} type="url" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
        <Input value={values.bookingPhone} onChange={set('bookingPhone')} type="tel" />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" isLoading={isLoading}>
          {tc('save')}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          {tc('cancel')}
        </Button>
      </div>
    </form>
  );
}
