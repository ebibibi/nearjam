'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface Registration {
  id: string;
  musicianProfile: {
    id: string;
    user: { nickname: string | null; image: string | null };
    instruments: { instrument: string }[];
  };
}

interface SessionAdminPanelProps {
  sessionId: string;
  registrations: Registration[];
}

export function SessionAdminPanel({ sessionId, registrations: initialRegs }: SessionAdminPanelProps) {
  const t = useTranslations('session');
  const router = useRouter();
  const [registrations, setRegistrations] = useState(initialRegs);
  const [completing, setCompleting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleComplete() {
    if (!confirm(t('confirmComplete'))) return;
    setCompleting(true);
    await fetch(`/api/v1/sessions/${sessionId}/complete`, { method: 'POST' });
    setCompleting(false);
    router.refresh();
  }

  async function handleRemove(regId: string) {
    setRemovingId(regId);
    await fetch(`/api/v1/sessions/${sessionId}/registrations/${regId}`, { method: 'DELETE' });
    setRegistrations((prev) => prev.filter((r) => r.id !== regId));
    setRemovingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
        <p className="text-sm font-medium text-amber-800 mb-3">{t('adminPanel')}</p>

        {registrations.length > 0 ? (
          <div className="space-y-2 mb-4">
            {registrations.map((reg) => (
              <div key={reg.id} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-amber-100">
                <div className="flex items-center gap-2">
                  {reg.musicianProfile.user.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={reg.musicianProfile.user.image} alt="" className="h-6 w-6 rounded-full" />
                  )}
                  <span className="text-sm">{reg.musicianProfile.user.nickname ?? 'Anonymous'}</span>
                  {reg.musicianProfile.instruments.length > 0 && (
                    <span className="text-xs text-gray-400">
                      ({reg.musicianProfile.instruments.map((i) => i.instrument).join(', ')})
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(reg.id)}
                  disabled={removingId === reg.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                >
                  {removingId === reg.id ? '...' : t('removeParticipant')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-4">{t('noParticipantsYet')}</p>
        )}

        <Button
          size="sm"
          variant="secondary"
          onClick={handleComplete}
          isLoading={completing}
        >
          ✅ {t('declareComplete')}
        </Button>
      </div>
    </div>
  );
}
