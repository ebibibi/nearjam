import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface SessionCardProps {
  session: {
    id: string;
    title: string;
    startsAt: Date | string;
    durationMinutes: number | null;
    format: string;
    isSyncroom: boolean;
    moodFlags: string[];
    maxParticipants: number | null;
    _count?: { registrations: number };
    venue?: { id: string; name: string; nearestStation: string | null } | null;
    studio?: { id: string; name: string } | null;
  };
  locale: string;
}

export function SessionCard({ session, locale }: SessionCardProps) {
  const t = useTranslations();

  const startDate = new Date(session.startsAt);

  return (
    <Link href={`/${locale}/sessions/${session.id}`}>
      <Card hover>
        <div className="flex items-start justify-between gap-2 mb-1">
          <CardTitle>{session.title}</CardTitle>
          {session.isSyncroom && <Badge variant="syncroom">SYNCROOM</Badge>}
        </div>

        <CardContent className="space-y-1">
          <p className="text-sm">
            📅 {startDate.toLocaleDateString(locale, {
              month: 'short',
              day: 'numeric',
              weekday: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
            {session.durationMinutes && ` (${session.durationMinutes}${t('common.minutes')})`}
          </p>

          {session.venue && (
            <p className="text-sm text-gray-600">
              📍 {session.venue.name}
              {session.venue.nearestStation && (
                <span className="text-gray-400 text-xs ml-1">（{session.venue.nearestStation}）</span>
              )}
            </p>
          )}
          {session.studio && !session.venue && (
            <p className="text-sm text-gray-600">🎵 {session.studio.name}</p>
          )}
          {!session.venue && !session.studio && !session.isSyncroom && (
            <p className="text-sm text-gray-400">{t('session.noVenue')}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">{t(`session.formats.${session.format}`)}</span>
            {session._count && session.maxParticipants && (
              <span className="text-xs text-gray-500">
                {t('session.participants', { n: session._count.registrations })}/{session.maxParticipants}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
