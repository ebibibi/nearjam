'use client'

import { useState } from 'react'

export default function OfflinePage() {
  const [isJa] = useState(() =>
    typeof navigator !== 'undefined' && navigator.language.startsWith('ja')
  )

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center p-4">
      <div className="text-6xl mb-4">🎵</div>
      <h1 className="text-2xl font-bold mb-2">
        {isJa ? 'オフラインです' : 'You are offline'}
      </h1>
      <p className="text-gray-500 mb-6">
        {isJa
          ? 'インターネット接続を確認して、もう一度お試しください'
          : 'Check your internet connection and try again.'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
      >
        {isJa ? '再読み込み' : 'Reload'}
      </button>
    </div>
  )
}
