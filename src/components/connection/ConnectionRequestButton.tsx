'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface ConnectionRequestButtonProps {
  targetUserId: string;
  status: 'none' | 'pending' | 'accepted';
}

export function ConnectionRequestButton({ targetUserId, status: initialStatus }: ConnectionRequestButtonProps) {
  const t = useTranslations('connection');
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: targetUserId }),
      });
      if (res.ok) {
        setStatus('pending');
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (status === 'accepted') {
    return (
      <span className="text-sm px-4 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200">
        ✓ {t('connected')}
      </span>
    );
  }

  if (status === 'pending') {
    return (
      <span className="text-sm px-4 py-2 rounded-lg bg-gray-50 text-gray-500 border border-gray-200">
        {t('pending')}
      </span>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={loading}
      className="text-sm px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
    >
      {loading ? '…' : t('connect')}
    </button>
  );
}
