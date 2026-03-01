'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface VenueClaimButtonProps {
  venueId: string;
}

export function VenueClaimButton({ venueId }: VenueClaimButtonProps) {
  const t = useTranslations('venueVerify');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/venues/${venueId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'MANUAL' }),
      });
      const data = await res.json();
      if (res.ok) {
        setClaimed(true);
        router.refresh();
      } else {
        setError(data.error ?? t('alreadyOwned'));
      }
    } finally {
      setLoading(false);
    }
  }

  if (claimed) {
    return (
      <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        ✓ {t('claimSuccess')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={claim}
        disabled={loading}
        className="text-sm px-4 py-2 rounded-lg border border-violet-300 text-violet-700 hover:bg-violet-50 disabled:opacity-50 transition-colors"
      >
        {loading ? '…' : t('claim')}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
