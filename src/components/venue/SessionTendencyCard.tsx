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
        {dayName && (
          <span>📅 {dayName}{timeRange && ` ${timeRange}`}</span>
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
