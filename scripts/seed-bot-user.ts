/**
 * NearJam Bot ユーザーのシードスクリプト
 *
 * Connpass インポートなど、システムが自動生成するセッションを
 * sessionAdminId に紐付けるために必要なボットユーザーを作成する。
 *
 * 使い方:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-bot-user.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../src/lib/prisma';
export { BOT_USER_ID, BOT_USER_EMAIL } from './constants';

async function main() {
  const existing = await prisma.user.findUnique({ where: { id: BOT_USER_ID } });

  if (existing) {
    console.log(`✅ Bot ユーザーはすでに存在します (id=${BOT_USER_ID})`);
    return;
  }

  const bot = await prisma.user.create({
    data: {
      id: BOT_USER_ID,
      name: 'NearJam Bot',
      email: BOT_USER_EMAIL,
      role: 'ADMIN',
    },
  });

  console.log(`🤖 Bot ユーザーを作成しました: ${bot.id} (${bot.email})`);
}

main()
  .catch((err) => {
    console.error('エラー:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
