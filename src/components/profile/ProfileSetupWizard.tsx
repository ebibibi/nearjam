'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ProfileSetupStep1 } from './ProfileSetupStep1';
import { ProfileSetupStep2 } from './ProfileSetupStep2';
import { ProfileSetupStep3 } from './ProfileSetupStep3';
import { ProfileSetupStep4 } from './ProfileSetupStep4';

interface FormData {
  nickname: string;
  bio: string;
  yearsPlaying: string;
  instruments: { instrument: string; proficiency: string }[];
  genres: string[];
  areaLabel: string;
  travelRadiusKm: string;
  isSyncroom: boolean;
  syncroomNotes: string;
  skillLevel: string;
  sessionGoal: string;
  levelPref: string;
  feedbackPref: string;
  sessionStyle: string;
}

interface ProfileSetupWizardProps {
  locale: string;
  initialNickname?: string | null;
}

export function ProfileSetupWizard({ locale, initialNickname }: ProfileSetupWizardProps) {
  const t = useTranslations('profile.setup');
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<FormData>({
    nickname: initialNickname ?? '',
    bio: '',
    yearsPlaying: '',
    instruments: [],
    genres: [],
    areaLabel: '',
    travelRadiusKm: '15',
    isSyncroom: false,
    syncroomNotes: '',
    skillLevel: 'BEGINNER',
    sessionGoal: 'BOTH',
    levelPref: 'EITHER',
    feedbackPref: 'LIGHT',
    sessionStyle: 'EITHER',
  });

  const update = (patch: Partial<FormData>) => setData((prev) => ({ ...prev, ...patch }));

  const TOTAL = 4;

  async function handleComplete() {
    setIsLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      nickname: data.nickname || undefined,
      bio: data.bio || undefined,
      yearsPlaying: data.yearsPlaying ? parseInt(data.yearsPlaying, 10) : undefined,
      instruments: data.instruments,
      genres: data.genres,
      areaLabel: data.areaLabel || undefined,
      travelRadiusKm: data.travelRadiusKm ? parseInt(data.travelRadiusKm, 10) : 15,
      skillLevel: data.skillLevel || undefined,
      sessionGoal: data.sessionGoal || undefined,
      levelPref: data.levelPref || undefined,
      feedbackPref: data.feedbackPref || undefined,
      sessionStyle: data.sessionStyle || undefined,
    };

    const res = await fetch('/api/v1/musicians/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? 'Something went wrong');
      setIsLoading(false);
      return;
    }

    // Add SYNCROOM coverage area if enabled
    if (data.isSyncroom) {
      await fetch('/api/v1/musicians/me/coverage-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaLabel: 'SYNCROOM',
          isSyncroom: true,
          syncroomNotes: data.syncroomNotes || undefined,
          isPublic: true,
        }),
      });
    }

    // Add home area if provided
    if (data.areaLabel) {
      await fetch('/api/v1/musicians/me/coverage-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          areaLabel: data.areaLabel,
          isHome: true,
          isPublic: true,
        }),
      });
    }

    router.push(`/${locale}/profile`);
    router.refresh();
  }

  return (
    <div className="max-w-xl">
      {/* Progress bar */}
      <div className="mb-8">
        <p className="text-sm text-gray-500 mb-2">{t('step', { current: step, total: TOTAL })}</p>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-600 transition-all duration-300"
            style={{ width: `${(step / TOTAL) * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-400">
          {[t('step1Title'), t('step2Title'), t('step3Title'), t('step4Title')].map((label, i) => (
            <span key={i} className={step === i + 1 ? 'text-violet-600 font-medium' : ''}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
          {error}
        </div>
      )}

      {step === 1 && <ProfileSetupStep1 data={data} onChange={update} />}
      {step === 2 && <ProfileSetupStep2 data={data} onChange={update} />}
      {step === 3 && <ProfileSetupStep3 data={data} onChange={update} />}
      {step === 4 && <ProfileSetupStep4 data={data} onChange={update} />}

      <div className="mt-6 flex justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((s) => s - 1)}
          className={step === 1 ? 'invisible' : ''}
        >
          ← Back
        </Button>

        {step < TOTAL ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)}>
            Next →
          </Button>
        ) : (
          <Button type="button" onClick={handleComplete} isLoading={isLoading}>
            {t('complete')}
          </Button>
        )}
      </div>
    </div>
  );
}
