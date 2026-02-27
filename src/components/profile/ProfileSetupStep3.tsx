import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/Input';

interface StepProps {
  data: {
    areaLabel: string;
    travelRadiusKm: string;
    isSyncroom: boolean;
    syncroomNotes: string;
  };
  onChange: (patch: {
    areaLabel?: string;
    travelRadiusKm?: string;
    isSyncroom?: boolean;
    syncroomNotes?: string;
  }) => void;
}

const TRAVEL_OPTIONS = [
  { value: '5', labelKey: '5' },
  { value: '15', labelKey: '15' },
  { value: '30', labelKey: '30' },
  { value: '999', labelKey: '999' },
] as const;

export function ProfileSetupStep3({ data, onChange }: StepProps) {
  const t = useTranslations('profile');

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">{t('setup.step3Title')}</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('coverageAreas.homeArea')}
        </label>
        <Input
          value={data.areaLabel}
          onChange={(e) => onChange({ areaLabel: e.target.value })}
          placeholder={t('coverageAreas.areaPlaceholder')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('travelRange')}</label>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_OPTIONS.map(({ value, labelKey }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange({ travelRadiusKm: value })}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                data.travelRadiusKm === value
                  ? 'border-violet-600 bg-violet-600 text-white'
                  : 'border-gray-300 text-gray-700 hover:border-violet-400'
              }`}
            >
              {t(`travelRanges.${labelKey}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.isSyncroom}
            onChange={(e) => onChange({ isSyncroom: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          <span className="text-sm font-medium text-gray-700">
            {t('coverageAreas.syncroom')}
          </span>
        </label>

        {data.isSyncroom && (
          <div className="ml-7">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('coverageAreas.syncroomNotes')}
            </label>
            <Input
              value={data.syncroomNotes}
              onChange={(e) => onChange({ syncroomNotes: e.target.value })}
              placeholder={t('coverageAreas.syncroomNotesPlaceholder')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
