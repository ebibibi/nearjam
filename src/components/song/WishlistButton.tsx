'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

interface WishlistButtonProps {
  songId: string;
  initialInWishlist?: boolean;
  initialPreferredKey?: string | null;
  isSignedIn?: boolean;
}

export function WishlistButton({
  songId,
  initialInWishlist = false,
  initialPreferredKey = null,
  isSignedIn = false,
}: WishlistButtonProps) {
  const t = useTranslations('song');
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [preferredKey, setPreferredKey] = useState<string | null>(initialPreferredKey);
  const [isLoading, setIsLoading] = useState(false);

  if (!isSignedIn) {
    return <span className="text-xs text-gray-400">{t('signInToWishlist')}</span>;
  }

  async function toggle() {
    setIsLoading(true);
    try {
      if (inWishlist) {
        await fetch(`/api/v1/musicians/me/wishlist/${songId}`, { method: 'DELETE' });
        setInWishlist(false);
        setPreferredKey(null);
      } else {
        await fetch('/api/v1/musicians/me/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songId }),
        });
        setInWishlist(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleKeyChange(key: string) {
    const next = key === '' ? null : key;
    setPreferredKey(next);
    await fetch(`/api/v1/musicians/me/wishlist/${songId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredKey: next }),
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={inWishlist ? 'primary' : 'secondary'}
        onClick={toggle}
        isLoading={isLoading}
      >
        {inWishlist ? `❤️ ${t('inWishlist')}` : t('addToWishlist')}
      </Button>

      {inWishlist && (
        <select
          value={preferredKey ?? ''}
          onChange={(e) => handleKeyChange(e.target.value)}
          className="text-xs rounded border border-gray-200 bg-white px-1.5 py-1 text-gray-700 focus:border-violet-400 focus:outline-none"
          title={t('preferredKey')}
        >
          <option value="">{t('keyAny')}</option>
          {KEYS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
      )}
    </div>
  );
}
