import { Badge } from '@/components/ui/Badge';

interface SongCardProps {
  song: {
    id: string;
    title: string;
    artist: string | null;
    genre: string | null;
    typicalKey: string | null;
    typicalBpmMin: number | null;
    typicalBpmMax: number | null;
    difficulty: string;
    wishlistCount: number;
  };
  action?: React.ReactNode;
}

const difficultyColor: Record<string, string> = {
  EASY: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HARD: 'bg-red-100 text-red-700',
  VARIES: 'bg-gray-100 text-gray-600',
};

export function SongCard({ song, action }: SongCardProps) {
  const bpm =
    song.typicalBpmMin != null
      ? song.typicalBpmMax && song.typicalBpmMax !== song.typicalBpmMin
        ? `${song.typicalBpmMin}–${song.typicalBpmMax}`
        : `${song.typicalBpmMin}`
      : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium text-gray-900 truncate">{song.title}</p>
        {song.artist && <p className="text-sm text-gray-500 truncate">{song.artist}</p>}

        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
          {song.genre && <span>🎵 {song.genre}</span>}
          {song.typicalKey && <span>🎼 {song.typicalKey}</span>}
          {bpm && <span>♩ {bpm} BPM</span>}
          {song.wishlistCount > 0 && <span>❤️ {song.wishlistCount}</span>}
        </div>

        {song.difficulty !== 'VARIES' && (
          <span className={`inline-block mt-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${difficultyColor[song.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
            {song.difficulty}
          </span>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
