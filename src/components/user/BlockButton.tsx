'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface BlockButtonProps {
  targetUserId: string;
  isBlocked: boolean;
}

export function BlockButton({ targetUserId, isBlocked: initialBlocked }: BlockButtonProps) {
  const t = useTranslations('user');
  const router = useRouter();
  const [blocked, setBlocked] = useState(initialBlocked);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const action = blocked ? 'unblock' : 'block';
    if (!blocked && !confirm(t('confirmBlock'))) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/users/${targetUserId}/block`, {
        method: blocked ? 'DELETE' : 'POST',
      });
      if (res.ok) {
        setBlocked(!blocked);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
    void action; // suppress unused warning
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded px-3 py-1 text-xs font-medium disabled:opacity-50 ${
        blocked
          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          : 'bg-red-50 text-red-600 hover:bg-red-100'
      }`}
    >
      {loading ? '...' : blocked ? t('unblock') : t('block')}
    </button>
  );
}
