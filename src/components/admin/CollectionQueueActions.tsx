'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface CollectionQueueActionsProps {
  tendencyId: string;
}

export function CollectionQueueActions({ tendencyId }: CollectionQueueActionsProps) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function act(action: 'approve' | 'reject') {
    setLoading(action);
    try {
      await fetch(`/api/v1/admin/collection-queue/${tendencyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex gap-2 shrink-0">
      <button
        onClick={() => act('approve')}
        disabled={loading !== null}
        className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading === 'approve' ? '…' : t('approve')}
      </button>
      <button
        onClick={() => act('reject')}
        disabled={loading !== null}
        className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
      >
        {loading === 'reject' ? '…' : t('reject')}
      </button>
    </div>
  );
}
