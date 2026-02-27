import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { VerificationBadge } from './VerificationBadge';

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    nearestStation: string | null;
    walkMinutes: number | null;
    verifiedAt: Date | null;
    disputedAt: Date | null;
    tendencies: { name: string }[];
  };
  locale: string;
}

export function VenueCard({ venue, locale }: VenueCardProps) {
  const t = useTranslations();

  return (
    <Link href={`/${locale}/venues/${venue.id}`}>
      <Card hover className="h-full">
        <div className="flex items-start justify-between gap-2 mb-1">
          <CardTitle>{venue.name}</CardTitle>
          <VerificationBadge verifiedAt={venue.verifiedAt} disputedAt={venue.disputedAt} />
        </div>

        {venue.nearestStation && (
          <p className="text-xs text-gray-500 mb-2">
            📍 {venue.nearestStation}
            {venue.walkMinutes != null && ` (${venue.walkMinutes}${t('common.minutes')})`}
          </p>
        )}

        {venue.tendencies.length > 0 && (
          <CardContent>
            <p className="text-sm text-gray-600 line-clamp-2">{venue.tendencies[0].name}</p>
            {venue.tendencies.length > 1 && (
              <Badge variant="genre" className="mt-1">
                +{venue.tendencies.length - 1}
              </Badge>
            )}
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
