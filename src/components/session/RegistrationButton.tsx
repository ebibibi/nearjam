'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

interface RegistrationButtonProps {
  sessionId: string;
  initialRegistered?: boolean;
  isSignedIn?: boolean;
  locale: string;
}

export function RegistrationButton({
  sessionId,
  initialRegistered = false,
  isSignedIn = false,
  locale,
}: RegistrationButtonProps) {
  const t = useTranslations('session');
  const [registered, setRegistered] = useState(initialRegistered);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isSignedIn) {
    return (
      <a href={`/${locale}/auth/signin`}>
        <Button variant="secondary">{t('register')}</Button>
      </a>
    );
  }

  async function toggle() {
    setIsLoading(true);
    setError(null);
    try {
      const method = registered ? 'DELETE' : 'POST';
      const res = await fetch(`/api/v1/sessions/${sessionId}/register`, { method });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Error');
        return;
      }
      setRegistered((r) => !r);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <Button
        onClick={toggle}
        isLoading={isLoading}
        variant={registered ? 'secondary' : 'primary'}
      >
        {registered ? `✅ ${t('registered')}` : t('register')}
      </Button>
      {registered && (
        <button
          type="button"
          onClick={toggle}
          className="ml-2 text-xs text-gray-400 hover:text-red-500"
        >
          {t('cancelRegistration')}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
