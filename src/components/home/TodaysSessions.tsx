'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

export interface TendencyRow {
  id: string;
  name: string;
  typicalDayOfWeek: number | null;
  typicalStartTime: string | null;
  typicalEndTime: string | null;
  genres: string[];
  entrySystem: string | null;
  levelRange: string | null;
  sourceUrl: string | null;
  venue: {
    id: string;
    name: string;
    nearestStation: string | null;
    walkMinutes: number | null;
    websiteUrl: string | null;
  };
}

interface TodaysSessionsProps {
  /** 全 active な SessionTendency を曜日付きで渡す */
  tendencies: TendencyRow[];
  /** サーバー側で算出した今日の曜日 (0=日〜6=土) */
  todayDow: number;
}

const DOW_LABELS_JA = ['日', '月', '火', '水', '木', '金', '土'];
const DOW_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function TodaysSessions({ tendencies, todayDow }: TodaysSessionsProps) {
  const [selectedDow, setSelectedDow] = useState(todayDow);
  const locale = useLocale();
  const t = useTranslations('home');
  const tVenue = useTranslations('venue');

  const dowLabels = locale === 'ja' ? DOW_LABELS_JA : DOW_LABELS_EN;

  // 選択曜日のセッションをフィルタ
  const filtered = tendencies.filter((s) => s.typicalDayOfWeek === selectedDow);
  // 不定期（曜日なし）
  const irregular = tendencies.filter((s) => s.typicalDayOfWeek === null);

  const isToday = selectedDow === todayDow;
  const isTomorrow = selectedDow === (todayDow + 1) % 7;

  return (
    <section>
      {/* 曜日タブ */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto">
        {dowLabels.map((label, dow) => {
          const count = tendencies.filter((s) => s.typicalDayOfWeek === dow).length;
          const isActive = selectedDow === dow;
          const isCurrentDay = dow === todayDow;
          return (
            <button
              key={dow}
              onClick={() => setSelectedDow(dow)}
              className={`
                flex flex-col items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors min-w-[3rem]
                ${isActive
                  ? 'bg-violet-600 text-white shadow-md'
                  : isCurrentDay
                  ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              <span>{label}</span>
              {count > 0 && (
                <span className={`text-xs mt-0.5 ${isActive ? 'text-violet-200' : 'text-gray-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* セクションヘッダー */}
      <h2 className="text-lg font-bold text-gray-900 mb-3">
        {isToday
          ? `🎵 ${t('todaysSessions')}（${dowLabels[selectedDow]}）`
          : isTomorrow
          ? `🎵 ${t('tomorrowsSessions')}（${dowLabels[selectedDow]}）`
          : `🎵 ${dowLabels[selectedDow]}${locale === 'ja' ? 'のセッション' : ' sessions'}`}
        <span className="text-sm font-normal text-gray-400 ml-2">
          {filtered.length}{locale === 'ja' ? '件' : ' found'}
        </span>
      </h2>

      {/* セッションリスト */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-6 text-center text-gray-400">
          <p>{t('noSessionsOnDay')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <SessionRow key={s.id} tendency={s} locale={locale} tVenue={tVenue} />
          ))}
        </div>
      )}

      {/* 不定期セッション */}
      {irregular.length > 0 && (
        <div className="mt-6">
          <h3 className="text-base font-bold text-gray-700 mb-3">
            📅 {t('irregularSessions')}
            <span className="text-sm font-normal text-gray-400 ml-2">
              {irregular.length}{locale === 'ja' ? '件' : ' found'}
            </span>
          </h3>
          <div className="space-y-2">
            {irregular.map((s) => (
              <SessionRow key={s.id} tendency={s} locale={locale} tVenue={tVenue} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SessionRow({
  tendency: s,
  locale,
  tVenue,
}: {
  tendency: TendencyRow;
  locale: string;
  tVenue: ReturnType<typeof useTranslations>;
}) {
  // ソースURL: セッションの sourceUrl か、会場の websiteUrl
  const sourceLink = s.sourceUrl ?? s.venue.websiteUrl;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:border-violet-200 hover:bg-violet-50/30 transition-colors">
      {/* 時間 */}
      <div className="shrink-0 w-14 text-center">
        {s.typicalStartTime ? (
          <span className="text-sm font-bold text-violet-700">{s.typicalStartTime}</span>
        ) : (
          <span className="text-xs text-gray-400">--:--</span>
        )}
        {s.typicalEndTime && (
          <div className="text-xs text-gray-400">〜{s.typicalEndTime}</div>
        )}
      </div>

      {/* メイン情報 */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/${locale}/venues/${s.venue.id}`}
          className="font-medium text-gray-900 hover:text-violet-700 hover:underline line-clamp-1"
        >
          {s.name}
        </Link>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
          <span>📍 {s.venue.name}</span>
          {s.venue.nearestStation && (
            <span className="text-gray-400">
              ({s.venue.nearestStation}
              {s.venue.walkMinutes != null && ` ${s.venue.walkMinutes}分`})
            </span>
          )}
        </div>
        {/* ジャンル + レベル + 料金 */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {s.genres.slice(0, 3).map((g) => (
            <span key={g} className="rounded bg-violet-100 text-violet-700 px-1.5 py-0.5 text-xs">
              {g}
            </span>
          ))}
          {s.levelRange && (
            <span className="rounded bg-emerald-100 text-emerald-700 px-1.5 py-0.5 text-xs">
              {s.levelRange}
            </span>
          )}
          {s.entrySystem && (
            <span className="rounded bg-amber-100 text-amber-700 px-1.5 py-0.5 text-xs">
              {s.entrySystem}
            </span>
          )}
        </div>
      </div>

      {/* 右端: 公式サイト直リンク */}
      {sourceLink && (
        <a
          href={sourceLink}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700 hover:bg-violet-100 hover:border-violet-300 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          🌐 {tVenue('visitWebsite')}
        </a>
      )}
    </div>
  );
}
