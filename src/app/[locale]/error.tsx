'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 px-4">
      <div className="text-6xl">🎵</div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">エラーが発生しました</h2>
        <p className="text-gray-600">
          ページの読み込みに失敗しました。もう一度お試しください。
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-violet-600 text-white px-6 py-2.5 text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          もう一度試す
        </button>
        <Link
          href="/ja"
          className="rounded-lg border border-gray-300 text-gray-700 px-6 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          ホームへ戻る
        </Link>
      </div>
    </div>
  );
}
