import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';
import type { SourceType } from '@prisma/client';

interface TendencyCardProps {
  tendency: {
    id: string;
    name: string;
    typicalDayOfWeek: number | null;
    typicalStartTime: string | null;
    typicalEndTime: string | null;
    genres: string[];
    atmosphere: string | null;
    levelRange: string | null;
    entrySystem: string | null;
    capacity: number | null;
    houseEquipment: string | null;
    sourceType: SourceType;
    sourceUrl?: string | null;
    sourceUser?: { nickname: string | null } | null;
    createdAt: Date;
  };
}

const sourceVariantMap: Record<SourceType, 'auto' | 'crowdsourced' | 'ownerVerified'> = {
  AUTO_COLLECTED: 'auto',
  CROWDSOURCED: 'crowdsourced',
  OWNER_VERIFIED: 'ownerVerified',
};

export function SessionTendencyCard({ tendency }: TendencyCardProps) {
  const t = useTranslations();

  const dayName = tendency.typicalDayOfWeek != null
    ? t(`tendency.days.${tendency.typicalDayOfWeek}`)
    : null;

  const timeRange = tendency.typicalStartTime
    ? `${tendency.typicalStartTime}${tendency.typicalEndTime ? `–${tendency.typicalEndTime}` : ''}`
    : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-gray-900">{tendency.name}</h4>
        <Badge variant={sourceVariantMap[tendency.sourceType]}>
          {t(`venue.sourceTypes.${tendency.sourceType}`)}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        {dayName ? (
          <span>📅 {dayName}{timeRange && ` ${timeRange}`}</span>
        ) : (
          <span className="text-gray-400">📅 {t('venue.irregular')}</span>
        )}
        {tendency.levelRange && <span>🎵 {tendency.levelRange}</span>}
        {tendency.entrySystem && <span>🎫 {tendency.entrySystem}</span>}
        {tendency.capacity != null && <span>👥 {tendency.capacity}</span>}
      </div>

      {tendency.genres.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tendency.genres.map((g) => (
            <Badge key={g} variant="genre">{g}</Badge>
          ))}
        </div>
      )}

      {tendency.atmosphere && (
        <p className="text-sm text-gray-600 line-clamp-2">{tendency.atmosphere}</p>
      )}

      {tendency.houseEquipment && (
        <p className="text-xs text-gray-500">🎸 {tendency.houseEquipment}</p>
      )}

      {/* Source URL — 目立つ直リンクCTA */}
      {tendency.sourceUrl && (
        <a
          href={tendency.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm text-violet-700 hover:bg-violet-100 hover:border-violet-400 transition-colors group"
        >
          <span>🔗</span>
          <span className="font-medium group-hover:underline">{t('tendency.sourcePage')}</span>
          <span className="ml-auto text-xs text-violet-400 truncate max-w-[200px]">{(() => { try { return new URL(tendency.sourceUrl).hostname; } catch { return ''; } })()}</span>
          <span className="text-violet-400">→</span>
        </a>
      )}

      {/* Attribution */}
      <p className="text-xs text-gray-400">
        {tendency.sourceType === 'CROWDSOURCED' && tendency.sourceUser
          ? t('tendency.attribution', {
              name: tendency.sourceUser.nickname ?? 'Anonymous',
              date: new Date(tendency.createdAt).toLocaleDateString(),
            })
          : tendency.sourceType === 'AUTO_COLLECTED'
          ? t('tendency.attributionAuto', { source: 'SNS/HP' })
          : t('tendency.attributionOwner')}
      </p>
    </div>
  );
}
