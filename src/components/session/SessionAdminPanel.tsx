'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface Registration {
  id: string;
  musicianProfile: {
    id: string;
    userId: string;
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
  const [delegatingTo, setDelegatingTo] = useState('');
  const [delegating, setDelegating] = useState(false);

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

  async function handleDelegate() {
    if (!delegatingTo) return;
    if (!confirm(t('confirmDelegate'))) return;
    setDelegating(true);
    await fetch(`/api/v1/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionAdminId: delegatingTo }),
    });
    setDelegating(false);
    router.refresh();
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
<Image src={reg.musicianProfile.user.image} alt="" width={24} height={24} className="rounded-full" />
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

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleComplete}
            isLoading={completing}
          >
            ✅ {t('declareComplete')}
          </Button>
        </div>

        {/* 管理者権限委譲 */}
        {registrations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-amber-200">
            <p className="text-xs text-amber-700 font-medium mb-2">{t('delegateAdmin')}</p>
            <div className="flex gap-2">
              <select
                value={delegatingTo}
                onChange={(e) => setDelegatingTo(e.target.value)}
                className="flex-1 text-xs rounded border border-amber-200 bg-white px-2 py-1.5 focus:outline-none"
              >
                <option value="">— {t('selectNewAdmin')} —</option>
                {registrations.map((reg) => (
                  <option key={reg.id} value={reg.musicianProfile.userId}>
                    {reg.musicianProfile.user.nickname ?? 'Anonymous'}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelegate}
                isLoading={delegating}
                disabled={!delegatingTo}
              >
                {t('delegate')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
