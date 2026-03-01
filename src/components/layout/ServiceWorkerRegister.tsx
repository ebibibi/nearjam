'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW 登録失敗は無視（オフライン機能なしで続行）
      })
    }
  }, [])

  return null
}
