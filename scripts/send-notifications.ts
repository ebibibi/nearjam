/**
 * NearJam 通知送信バッチ
 *
 * 使い方:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/send-notifications.ts
 *
 * または package.json の scripts から:
 *   npm run notifications:send
 *
 * scheduledFor <= now() かつ sent = false の Notification をすべてメール送信する。
 * PRD §4: 毎朝 6:00 JST 以降に実行することでタイミング攻撃を防ぐ。
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { processScheduledNotifications } from '../src/lib/send-notifications';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('[send-notifications] バッチ開始:', new Date().toISOString());

  try {
    const result = await processScheduledNotifications();
    console.log('[send-notifications] 結果:', result);
    process.exit(result.failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('[send-notifications] 予期しないエラー:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
