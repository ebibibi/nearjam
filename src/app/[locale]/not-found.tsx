import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 px-4">
      <div className="text-6xl">🎸</div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">404</h1>
        <p className="text-gray-600">
          お探しのページが見つかりませんでした。
        </p>
        <p className="text-sm text-gray-400">
          会場・セッションが削除されたか、URLが間違っている可能性があります。
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/ja/venues"
          className="rounded-lg bg-violet-600 text-white px-6 py-2.5 text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          📍 会場一覧へ
        </Link>
        <Link
          href="/ja/sessions"
          className="rounded-lg border border-violet-300 text-violet-700 px-6 py-2.5 text-sm font-medium hover:bg-violet-50 transition-colors"
        >
          🎷 セッション一覧へ
        </Link>
      </div>
    </div>
  );
}
