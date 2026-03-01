import { useTranslations } from 'next-intl';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

interface StepProps {
  data: {
    skillLevel: string;
    sessionGoal: string;
    levelPref: string;
    feedbackPref: string;
    sessionStyle: string;
    playVolumePref: string;
    challengePref: string;
    tempoPref: string;
    snsYoutube: string;
    snsInstagram: string;
    snsX: string;
    snsSoundcloud: string;
  };
  onChange: (patch: {
    skillLevel?: string;
    sessionGoal?: string;
    levelPref?: string;
    feedbackPref?: string;
    sessionStyle?: string;
    playVolumePref?: string;
    challengePref?: string;
    tempoPref?: string;
    snsYoutube?: string;
    snsInstagram?: string;
    snsX?: string;
    snsSoundcloud?: string;
  }) => void;
}

export function ProfileSetupStep4({ data, onChange }: StepProps) {
  const t = useTranslations('profile');

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{t('setup.step4Title')}</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('skillLevel')}</label>
        <Select
          value={data.skillLevel}
          onChange={(e) => onChange({ skillLevel: e.target.value })}
        >
          {(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ANY'] as const).map((v) => (
            <option key={v} value={v}>
              {t(`skillLevels.${v}`)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('sessionGoal')}</label>
        <Select
          value={data.sessionGoal}
          onChange={(e) => onChange({ sessionGoal: e.target.value })}
        >
          {(['FUN', 'IMPROVE', 'BOTH'] as const).map((v) => (
            <option key={v} value={v}>
              {t(`sessionGoals.${v}`)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('levelPrefLabel')}
        </label>
        <Select
          value={data.levelPref}
          onChange={(e) => onChange({ levelPref: e.target.value })}
        >
          {(['SAME_LEVEL', 'JOIN_BETTER', 'EITHER'] as const).map((v) => (
            <option key={v} value={v}>
              {t(`levelPrefs.${v}`)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('feedbackPrefLabel')}
        </label>
        <Select
          value={data.feedbackPref}
          onChange={(e) => onChange({ feedbackPref: e.target.value })}
        >
          {(['WELCOME', 'LIGHT', 'NONE'] as const).map((v) => (
            <option key={v} value={v}>
              {t(`feedbackPrefs.${v}`)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('sessionStyleLabel')}</label>
        <Select
          value={data.sessionStyle}
          onChange={(e) => onChange({ sessionStyle: e.target.value })}
        >
          {(['DEEP', 'VARIETY', 'EITHER'] as const).map((v) => (
            <option key={v} value={v}>
              {t(`sessionStyles.${v}`)}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('playVolumePrefLabel')}</label>
        <Select
          value={data.playVolumePref}
          onChange={(e) => onChange({ playVolumePref: e.target.value })}
        >
          {(['LOTS', 'SPECIFIC_ONLY', 'EITHER'] as const).map((v) => (
            <option key={v} value={v}>{t(`playVolumePrefs.${v}`)}</option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('challengePrefLabel')}</label>
        <Select
          value={data.challengePref}
          onChange={(e) => onChange({ challengePref: e.target.value })}
        >
          {(['KNOWN_ONLY', 'CHALLENGE', 'EITHER'] as const).map((v) => (
            <option key={v} value={v}>{t(`challengePrefs.${v}`)}</option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('tempoPrefLabel')}</label>
        <Select
          value={data.tempoPref}
          onChange={(e) => onChange({ tempoPref: e.target.value })}
        >
          {(['SLOW', 'MODERATE', 'FAST'] as const).map((v) => (
            <option key={v} value={v}>{t(`tempoPrefs.${v}`)}</option>
          ))}
        </Select>
      </div>

      {/* SNS リンク（任意） */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-medium text-gray-700 mb-3">{t('snsLinks')} <span className="text-gray-400 font-normal">({t('setup.optional')})</span></p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-24 text-xs text-gray-500">▶️ YouTube</span>
            <Input
              value={data.snsYoutube}
              onChange={(e) => onChange({ snsYoutube: e.target.value })}
              placeholder="https://youtube.com/@..."
              type="url"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 text-xs text-gray-500">📸 Instagram</span>
            <Input
              value={data.snsInstagram}
              onChange={(e) => onChange({ snsInstagram: e.target.value })}
              placeholder="https://instagram.com/..."
              type="url"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 text-xs text-gray-500">🐦 X</span>
            <Input
              value={data.snsX}
              onChange={(e) => onChange({ snsX: e.target.value })}
              placeholder="https://x.com/..."
              type="url"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-24 text-xs text-gray-500">☁️ SoundCloud</span>
            <Input
              value={data.snsSoundcloud}
              onChange={(e) => onChange({ snsSoundcloud: e.target.value })}
              placeholder="https://soundcloud.com/..."
              type="url"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
