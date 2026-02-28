import { test, expect } from '@playwright/test';

// ────────────────────────────────────────────────
// スモークテスト — 認証不要なページが正しく表示されるかを確認する
// DB の中身に依存しない（空でも OK）テストのみ記述する
// ────────────────────────────────────────────────

// ヘッダーロゴを一意に特定するヘルパー
// フッターに「© NearJam」が追加されたため getByText('NearJam') は複数マッチする。
// ロール + 名前で header のロゴリンクだけを特定する。
const headerLogo = (page: Parameters<Parameters<typeof test>[1]>[0]) =>
  page.getByRole('link', { name: /🎸 NearJam/i });

test.describe('トップページ', () => {
  test('ページタイトルと主要要素が表示される', async ({ page }) => {
    await page.goto('/');
    // / → /en/（または /ja/）にリダイレクトされることを確認
    await expect(page).toHaveURL(/\/(en|ja)\/?$/);

    // <title> に NearJam が含まれる
    await expect(page).toHaveTitle(/NearJam/);

    // ヘッダーロゴ
    await expect(headerLogo(page)).toBeVisible();
  });

  test('ヒーローセクションのテキストとボタンが表示される', async ({ page }) => {
    await page.goto('/en');

    // ヒーロータイトル
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // CTA ボタン（2 つ）
    await expect(page.getByRole('link', { name: /Browse Sessions/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Find Venues/i })).toBeVisible();
  });

  test('ナビゲーションメニューが表示される', async ({ page }) => {
    await page.goto('/en');

    const nav = page.getByRole('navigation');
    await expect(nav.getByRole('link', { name: /Venues/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Studios/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Sessions/i })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Songs/i })).toBeVisible();
  });
});

test.describe('会場ページ', () => {
  test('ページが正常に表示される', async ({ page }) => {
    await page.goto('/en/venues');
    await expect(page).toHaveTitle(/NearJam/);
    await expect(headerLogo(page)).toBeVisible();
  });

  test('会場追加ボタンが存在する', async ({ page }) => {
    await page.goto('/en/venues');
    // ページ上に複数の「Add venue」リンクが存在しうるため first() で絞る
    await expect(page.getByRole('link', { name: /Add venue/i }).first()).toBeVisible();
  });
});

test.describe('スタジオページ', () => {
  test('ページが正常に表示される', async ({ page }) => {
    await page.goto('/en/studios');
    await expect(page).toHaveTitle(/NearJam/);
    await expect(headerLogo(page)).toBeVisible();
  });
});

test.describe('セッションページ', () => {
  test('ページが正常に表示される', async ({ page }) => {
    await page.goto('/en/sessions');
    await expect(page).toHaveTitle(/NearJam/);
    await expect(headerLogo(page)).toBeVisible();
  });
});

test.describe('曲ページ', () => {
  test('ページが正常に表示される', async ({ page }) => {
    await page.goto('/en/songs');
    await expect(page).toHaveTitle(/NearJam/);
    await expect(headerLogo(page)).toBeVisible();
  });
});

test.describe('日本語ロケール', () => {
  test('/ja でも正常に表示される', async ({ page }) => {
    await page.goto('/ja');
    await expect(page).toHaveTitle(/NearJam/);
    await expect(headerLogo(page)).toBeVisible();
  });
});

test.describe('ナビゲーション', () => {
  test('ヒーローの Browse Sessions ボタンでセッションページに遷移する', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('link', { name: /Browse Sessions/i }).click();
    await expect(page).toHaveURL(/\/en\/sessions/);
    await expect(page).toHaveTitle(/NearJam/);
  });

  test('ヒーローの Find Venues ボタンで会場ページに遷移する', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('link', { name: /Find Venues/i }).click();
    await expect(page).toHaveURL(/\/en\/venues/);
    await expect(page).toHaveTitle(/NearJam/);
  });

  test('ロゴクリックでトップページに戻る', async ({ page }) => {
    await page.goto('/en/sessions');
    await headerLogo(page).click();
    await expect(page).toHaveURL(/\/en\/?$/);
  });
});

test.describe('サインインページ', () => {
  test('サインインページが表示される', async ({ page }) => {
    await page.goto('/en/auth/signin');
    await expect(page).toHaveTitle(/NearJam/);
    // Google / Email のサインインボタンが存在することを確認
    await expect(page.getByRole('button', { name: /Sign in with Google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in with Email/i })).toBeVisible();
  });
});
