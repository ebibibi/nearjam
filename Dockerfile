# ── ステージ1: 依存関係インストール ──────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ── ステージ2: ビルド ──────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma クライアント生成（DATABASE_URL はビルド時には不要だが generate は必要）
RUN npx prisma generate

# Next.js ビルド（standalone モード）
# 静的ファイルと public を standalone ディレクトリにコピー
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── ステージ3: 本番イメージ ────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Azure Container Apps はデフォルトで PORT=8080 を使用
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# セキュリティ: 非rootユーザーで実行
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# standalone ビルド成果物をコピー
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
