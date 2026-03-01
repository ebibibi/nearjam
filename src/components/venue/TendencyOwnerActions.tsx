'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface TendencyOwnerActionsProps {
  venueId: string;
  tendencyId: string;
  currentSourceType: string;
  isActive: boolean;
}

export function TendencyOwnerActions({
  venueId,
  tendencyId,
  currentSourceType,
  isActive,
}: TendencyOwnerActionsProps) {
  const t = useTranslations('venue');
  const router = useRouter();
  const [loading, setLoading] = useState<'confirm' | 'outdated' | null>(null);

  async function handleAction(action: 'confirm' | 'outdated') {
    setLoading(action);
    await fetch(`/api/v1/venues/${venueId}/tendencies/${tendencyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex gap-2 mt-2">
      {isActive && currentSourceType !== 'OWNER_VERIFIED' && (
        <button
          onClick={() => handleAction('confirm')}
          disabled={loading !== null}
          className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
        >
          {loading === 'confirm' ? '…' : t('tendencyConfirm')}
        </button>
      )}
      {isActive && (
        <button
          onClick={() => handleAction('outdated')}
          disabled={loading !== null}
          className="text-xs px-2 py-1 rounded bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 disabled:opacity-50"
        >
          {loading === 'outdated' ? '…' : t('tendencyOutdated')}
        </button>
      )}
      {!isActive && (
        <span className="text-xs text-gray-400 italic">{t('tendencyMarkedOutdated')}</span>
      )}
    </div>
  );
}
