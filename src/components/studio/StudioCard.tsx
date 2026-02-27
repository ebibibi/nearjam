import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface StudioCardProps {
  studio: {
    id: string;
    name: string;
    nearestStation: string | null;
    walkMinutes: number | null;
    bookingMethod: string | null;
    verifiedAt: Date | null;
    rooms: { id: string }[];
  };
  locale: string;
}

export function StudioCard({ studio, locale }: StudioCardProps) {
  const t = useTranslations();

  return (
    <Link href={`/${locale}/studios/${studio.id}`}>
      <Card hover className="h-full">
        <div className="flex items-start justify-between gap-2 mb-1">
          <CardTitle>{studio.name}</CardTitle>
          {studio.verifiedAt ? (
            <Badge variant="verified">✅ {t('venue.verified')}</Badge>
          ) : (
            <Badge variant="unverified">⚠️ {t('venue.unverified')}</Badge>
          )}
        </div>

        {studio.nearestStation && (
          <p className="text-xs text-gray-500 mb-2">
            📍 {studio.nearestStation}
            {studio.walkMinutes != null && ` (${studio.walkMinutes}${t('common.minutes')})`}
          </p>
        )}

        <CardContent>
          <div className="flex flex-wrap gap-2 mt-1">
            {studio.rooms.length > 0 && (
              <span className="text-xs text-gray-500">
                🚪 {studio.rooms.length} {t('studio.rooms').toLowerCase()}
              </span>
            )}
            {studio.bookingMethod && (
              <span className="text-xs text-gray-500">
                📅 {t(`studio.bookingMethods.${studio.bookingMethod}`)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
