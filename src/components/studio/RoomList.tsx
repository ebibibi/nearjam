import { useTranslations } from 'next-intl';

interface Room {
  id: string;
  name: string;
  capacityPersons: number | null;
  sizeSqm: number | null;
  hasDrums: boolean;
  drumSpec: string | null;
  hasPA: boolean;
  paSpec: string | null;
  hasPiano: boolean;
  hasAmps: boolean;
  hasMics: boolean;
  hourlyRateYen: number | null;
  hourlyRatePeak: number | null;
  minBookingHours: number | null;
  notes: string | null;
}

interface RoomListProps {
  rooms: Room[];
}

export function RoomList({ rooms }: RoomListProps) {
  const t = useTranslations('studio');
  const tc = useTranslations('common');

  if (rooms.length === 0) {
    return <p className="text-sm text-gray-500">{t('noRooms')}</p>;
  }

  return (
    <div className="space-y-3">
      {rooms.map((room) => (
        <div key={room.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-medium text-gray-900">{room.name}</h4>
            {room.hourlyRateYen != null && (
              <span className="text-sm font-semibold text-violet-700">
                {tc('yen', { amount: room.hourlyRateYen })}/{tc('perHour', { amount: '' }).replace('/', '')}hr
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mb-2">
            {room.capacityPersons != null && (
              <span>👥 {t('capacityPersons', { n: room.capacityPersons })}</span>
            )}
            {room.sizeSqm != null && <span>📐 {room.sizeSqm} sqm</span>}
            {room.minBookingHours != null && (
              <span>⏱ {t('minBookingHours', { n: room.minBookingHours })}</span>
            )}
            {room.hourlyRatePeak != null && (
              <span>📈 {t('hourlyRatePeak')}: {tc('yen', { amount: room.hourlyRatePeak })}/hr</span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {room.hasDrums && (
              <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5">
                🥁 {t('hasDrums')}{room.drumSpec ? ` (${room.drumSpec})` : ''}
              </span>
            )}
            {room.hasPA && (
              <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5">
                🎙 {t('hasPA')}{room.paSpec ? ` (${room.paSpec})` : ''}
              </span>
            )}
            {room.hasPiano && (
              <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5">
                🎹 {t('hasPiano')}
              </span>
            )}
            {room.hasAmps && (
              <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5">
                🎸 {t('hasAmps')}
              </span>
            )}
            {room.hasMics && (
              <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5">
                🎤 {t('hasMics')}
              </span>
            )}
          </div>

          {room.notes && (
            <p className="mt-2 text-xs text-gray-500">{room.notes}</p>
          )}
        </div>
      ))}
    </div>
  );
}
