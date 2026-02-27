'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

interface WishlistButtonProps {
  songId: string;
  initialInWishlist?: boolean;
  isSignedIn?: boolean;
}

export function WishlistButton({ songId, initialInWishlist = false, isSignedIn = false }: WishlistButtonProps) {
  const t = useTranslations('song');
  const [inWishlist, setInWishlist] = useState(initialInWishlist);
  const [isLoading, setIsLoading] = useState(false);

  if (!isSignedIn) {
    return (
      <span className="text-xs text-gray-400">{t('signInToWishlist')}</span>
    );
  }

  async function toggle() {
    setIsLoading(true);
    try {
      if (inWishlist) {
        await fetch(`/api/v1/musicians/me/wishlist/${songId}`, { method: 'DELETE' });
        setInWishlist(false);
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

  return (
    <Button
      size="sm"
      variant={inWishlist ? 'primary' : 'secondary'}
      onClick={toggle}
      isLoading={isLoading}
    >
      {inWishlist ? `❤️ ${t('inWishlist')}` : t('addToWishlist')}
    </Button>
  );
}
