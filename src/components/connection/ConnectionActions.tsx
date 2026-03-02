'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface ConnectionActionsProps {
  connectionId: string;
  mode: 'received' | 'sent';
}

export function ConnectionActions({ connectionId, mode }: ConnectionActionsProps) {
  const t = useTranslations('connection');
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function act(action: 'accept' | 'reject' | 'cancel') {
    setLoading(action);
    try {
      await fetch(`/api/v1/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } catch {
      // network error — silently ignore, user can retry
    } finally {
      setLoading(null);
    }
  }

  if (mode === 'received') {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => act('accept')}
          disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {loading === 'accept' ? '…' : t('accept')}
        </button>
        <button
          onClick={() => act('reject')}
          disabled={loading !== null}
          className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
        >
          {loading === 'reject' ? '…' : t('reject')}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => act('cancel')}
      disabled={loading !== null}
      className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
    >
      {loading === 'cancel' ? '…' : t('cancel')}
    </button>
  );
}
