'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { SongQueue } from './SongQueue';
import { AddSongToQueue } from './AddSongToQueue';

interface QueueItem {
  id: string;
  orderIndex: number;
  keyOverride: string | null;
  song: {
    id: string;
    title: string;
    artist: string | null;
    genre: string | null;
    typicalKey: string | null;
  };
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface LiveSessionDashboardProps {
  sessionId: string;
  sessionTitle: string;
}

export function LiveSessionDashboard({ sessionId, sessionTitle }: LiveSessionDashboardProps) {
  const t = useTranslations('live');
  const [localQueue, setLocalQueue] = useState<QueueItem[] | null>(null);

  const { data, mutate } = useSWR<QueueItem[]>(
    `/api/v1/sessions/${sessionId}/queue`,
    fetcher,
    { refreshInterval: 10_000 }
  );

  const queue = localQueue ?? data ?? [];

  const handleReorder = useCallback((updated: QueueItem[]) => {
    setLocalQueue(updated);
  }, []);

  const handleRemove = useCallback((itemId: string) => {
    setLocalQueue((prev) => (prev ?? data ?? []).filter((i) => i.id !== itemId));
  }, [data]);

  const handleAdded = useCallback(async () => {
    setLocalQueue(null);
    await mutate();
  }, [mutate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500">{sessionTitle}</p>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">{t('queue')}</h2>
          <span className="text-xs text-gray-400">{t('dragToReorder')}</span>
        </div>
        <SongQueue
          items={queue}
          sessionId={sessionId}
          onReorder={handleReorder}
          onRemove={handleRemove}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('addToQueue')}</h2>
        <AddSongToQueue sessionId={sessionId} onAdded={handleAdded} />
      </section>
    </div>
  );
}
