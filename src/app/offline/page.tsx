'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
      <div className="text-6xl mb-4">🎵</div>
      <h1 className="text-2xl font-bold mb-2">オフラインです</h1>
      <p className="text-gray-500 mb-6">
        インターネット接続を確認して、もう一度お試しください
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
      >
        再読み込み
      </button>
    </div>
  )
}
