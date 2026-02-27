import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';

const MOOD_FLAGS = [
  'MISTAKES_WELCOME',
  'BEGINNER_FRIENDLY',
  'ADVANCED',
  'PRACTICE_FOCUSED',
  'THEME_NIGHT',
  'LISTENING_CULTURE',
  'LIVELY',
  'CONNECTION_FIRST',
] as const;

interface MoodFlagBadgesProps {
  flags: string[];
  selectable?: boolean;
  selected?: string[];
  onToggle?: (flag: string) => void;
}

export function MoodFlagBadges({ flags, selectable = false, selected = [], onToggle }: MoodFlagBadgesProps) {
  const t = useTranslations('session.moodFlagDescriptions');

  if (!selectable) {
    return (
      <div className="flex flex-wrap gap-1">
        {flags.map((flag) => (
          <span key={flag} className="rounded-full bg-violet-50 border border-violet-200 text-violet-700 px-2 py-0.5 text-xs">
            {t(flag as typeof MOOD_FLAGS[number])}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {MOOD_FLAGS.map((flag) => {
        const isSelected = selected.includes(flag);
        return (
          <button
            key={flag}
            type="button"
            onClick={() => onToggle?.(flag)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              isSelected
                ? 'border-violet-600 bg-violet-600 text-white'
                : 'border-gray-300 text-gray-700 hover:border-violet-400'
            }`}
          >
            {t(flag)}
          </button>
        );
      })}
    </div>
  );
}
