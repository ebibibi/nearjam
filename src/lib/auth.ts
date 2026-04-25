import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
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
