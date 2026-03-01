import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const MOOD_EMOJI: Record<string, string> = {
  MISTAKES_WELCOME: '🤝',
  BEGINNER_FRIENDLY: '🌱',
  ADVANCED: '⚡',
  PRACTICE_FOCUSED: '🎯',
  THEME_NIGHT: '🎭',
  LISTENING_CULTURE: '🎧',
  LIVELY: '🔥',
  CONNECTION_FIRST: '💫',
};

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
    ticketPriceYen: number | null;
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
            {session.durationMinutes && ` (${t('session.durationMinutes', { n: session.durationMinutes })})`}
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

          <div className="flex items-center gap-2 flex-wrap mt-1">
            {session.ticketPriceYen != null && session.ticketPriceYen > 0 ? (
              <span className="text-xs rounded-full bg-blue-100 text-blue-700 px-2 py-0.5">
                ¥{session.ticketPriceYen.toLocaleString()}
              </span>
            ) : (
              <span className="text-xs rounded-full bg-green-100 text-green-700 px-2 py-0.5">
                {t('session.freeOrDoorPrice')}
              </span>
            )}
            <span className="text-xs text-gray-500">{t(`session.formats.${session.format}`)}</span>
            {session._count && session.maxParticipants && (
              <span className="text-xs text-gray-500">
                👥 {session._count.registrations}/{session.maxParticipants}
              </span>
            )}
          </div>

          {session.moodFlags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {session.moodFlags.slice(0, 3).map((flag) => (
                <span key={flag} className="text-xs" title={flag}>
                  {MOOD_EMOJI[flag] ?? '🎵'}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
