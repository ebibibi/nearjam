'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Input } from '@/components/ui/Input';
import { useTranslations } from 'next-intl';

export function VenueSearch({ defaultValue }: { defaultValue?: string }) {
  const t = useTranslations('venue');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (q) {
      params.set('q', q);
    } else {
      params.delete('q');
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <Input
      type="search"
      defaultValue={defaultValue}
      onChange={handleChange}
      placeholder={t('searchPlaceholder')}
      className="max-w-sm"
    />
  );
}
