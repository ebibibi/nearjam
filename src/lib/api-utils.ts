import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// 認証チェック — 未ログインなら 401 を返す
export async function requireAuth(): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return { userId: session.user.id };
}

// 認証チェック（ユーザーID のみ返す、エラーは呼び出し側で処理）
export async function getAuthUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// 成功レスポンス
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// エラーレスポンス
export function err(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// ページネーション用ヘルパー
export function parsePagination(searchParams: URLSearchParams): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  return { page, limit, skip: (page - 1) * limit };
}
