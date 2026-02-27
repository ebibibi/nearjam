import { useTranslations } from 'next-intl';
import { Select } from '@/components/ui/Select';

interface StepProps {
  data: {
    skillLevel: string;
    sessionGoal: string;
    levelPref: string;
    feedbackPref: string;
    sessionStyle: string;
  };
  onChange: (patch: {
    skillLevel?: string;
    sessionGoal?: string;
    levelPref?: string;
    feedbackPref?: string;
    sessionStyle?: string;
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
          {t('levelPrefs.SAME_LEVEL').split(' ')[0]} preference
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
          Feedback preference
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Session style</label>
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
    </div>
  );
}
