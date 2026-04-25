import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export let lastAuthError: { time: string; error: string; stack?: string } | null = null;

const authLogger: NextAuthConfig["logger"] = {
  error(error) {
    const entry = {
      time: new Date().toISOString(),
      error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      stack: error instanceof Error ? error.stack?.split("\n").slice(0, 8).join("\n") : undefined,
    };
    lastAuthError = entry;
    console.error("[AUTH_ERROR]", JSON.stringify(entry));
  },
  warn(code) {
    console.warn("[AUTH_WARN]", code);
  },
  debug(message, metadata) {
    console.log("[AUTH_DEBUG]", message, metadata ? JSON.stringify(metadata).substring(0, 500) : "");
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: true,
  logger: authLogger,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    // メールマジックリンク（Resend は MVP 段階ではオプション）
    // 実装時は AUTH_RESEND_KEY 環境変数が必要
    ...(process.env.AUTH_RESEND_KEY
      ? [
          Resend({
            apiKey: process.env.AUTH_RESEND_KEY,
            from: "NearJam <noreply@nearjam.app>",
          }),
        ]
      : []),
  ],
  callbacks: {
    session({ session, user }) {
      // セッションにユーザー ID を含める（API Routes で利用）
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    // next-intl のデフォルトロケール (en) を明示
    // middleware が /en/auth/signin → ロケール付きパスに解決する
    signIn: "/en/auth/signin",
    error: "/en/auth/error",
  },
});
