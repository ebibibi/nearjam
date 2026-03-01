import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { VerificationBadge } from './VerificationBadge';

const DAY_NAMES_JA = ['日', '月', '火', '水', '木', '金', '土'] as const;
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface VenueCardProps {
  venue: {
    id: string;
    name: string;
    nearestStation: string | null;
    walkMinutes: number | null;
    websiteUrl: string | null;
    instagramUrl: string | null;
    xUrl: string | null;
    verifiedAt: Date | null;
    disputedAt: Date | null;
    tendencies: {
      name: string;
      typicalDayOfWeek: number | null;
      typicalStartTime: string | null;
      genres: string[];
      entrySystem: string | null;
    }[];
  };
  locale: string;
  upcomingSessionCount?: number;
}

export function VenueCard({ venue, locale, upcomingSessionCount = 0 }: VenueCardProps) {
  const t = useTranslations();
  const dayNames = locale === 'ja' ? DAY_NAMES_JA : DAY_NAMES_EN;

  return (
    <Link href={`/${locale}/venues/${venue.id}`}>
      <Card hover className="h-full flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <CardTitle className="flex-1">{venue.name}</CardTitle>
          <div className="flex items-center gap-1 shrink-0">
            {upcomingSessionCount > 0 && (
              <span className="rounded-full bg-amber-100 text-amber-700 text-xs px-2 py-0.5 font-medium">
                📅 {upcomingSessionCount}
              </span>
            )}
            <VerificationBadge verifiedAt={venue.verifiedAt} disputedAt={venue.disputedAt} />
          </div>
        </div>

        {venue.nearestStation && (
          <p className="text-xs text-gray-500 mb-2">
            📍 {venue.nearestStation}
            {venue.walkMinutes != null && ` ${t('common.minutes', { count: venue.walkMinutes })}`}
          </p>
        )}

        {/* SNS リンク */}
        {(venue.websiteUrl || venue.instagramUrl || venue.xUrl) && (
          <div className="flex gap-2 mb-3 text-xs text-gray-400">
            {venue.websiteUrl && <span>🌐 HP</span>}
            {venue.instagramUrl && <span>📸 IG</span>}
            {venue.xUrl && <span>🐦 X</span>}
          </div>
        )}

        {/* セッション情報 */}
        {venue.tendencies.length > 0 ? (
          <CardContent className="flex-1 space-y-2">
            {venue.tendencies.slice(0, 2).map((tendency, i) => (
              <div key={i} className="rounded-lg bg-violet-50 px-3 py-2 text-xs">
                <div className="font-medium text-violet-800 mb-0.5 line-clamp-1">{tendency.name}</div>
                <div className="text-violet-600 flex flex-wrap gap-x-2 gap-y-0.5">
                  {tendency.typicalDayOfWeek != null ? (
                    <span>
                      {locale === 'ja'
                        ? `毎週${dayNames[tendency.typicalDayOfWeek]}曜`
                        : `Every ${dayNames[tendency.typicalDayOfWeek]}`}
                    </span>
                  ) : (
                    <span className="text-violet-400">{locale === 'ja' ? '不定期開催' : 'Irregular'}</span>
                  )}
                  {tendency.typicalStartTime && <span>{tendency.typicalStartTime}〜</span>}
                  {tendency.entrySystem && <span>{tendency.entrySystem}</span>}
                </div>
                {tendency.genres.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tendency.genres.slice(0, 3).map((g) => (
                      <span key={g} className="rounded bg-violet-100 px-1.5 py-0.5 text-violet-700">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {venue.tendencies.length > 2 && (
              <p className="text-xs text-gray-400">+{venue.tendencies.length - 2} {locale === 'ja' ? 'セッション' : 'sessions'}</p>
            )}
          </CardContent>
        ) : (
          <CardContent className="flex-1 text-gray-400 text-sm space-y-2">
            <p>{locale === 'ja' ? 'セッション情報なし' : 'No session info'}</p>
            <Badge variant="unverified">{t('venue.unverified')}</Badge>
          </CardContent>
        )}
      </Card>
    </Link>
  );
}
