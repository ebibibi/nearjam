import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/Input';

interface StepProps {
  data: { nickname: string; bio: string; yearsPlaying: string };
  onChange: (patch: { nickname?: string; bio?: string; yearsPlaying?: string }) => void;
}

export function ProfileSetupStep1({ data, onChange }: StepProps) {
  const t = useTranslations('profile.setup');

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{t('step1Title')}</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('nickname')} <span className="text-red-500">*</span>
        </label>
        <Input
          value={data.nickname}
          onChange={(e) => onChange({ nickname: e.target.value })}
          placeholder={t('nicknamePlaceholder')}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('bio')}</label>
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[80px]"
          value={data.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          placeholder={t('bioPlaceholder')}
          maxLength={500}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('yearsPlaying')}</label>
        <Input
          type="number"
          value={data.yearsPlaying}
          onChange={(e) => onChange({ yearsPlaying: e.target.value })}
          min={0}
          max={80}
        />
      </div>
    </div>
  );
}
