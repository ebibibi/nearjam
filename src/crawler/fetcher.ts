import { chromium } from '@playwright/test';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
});

const MAX_CHARS = 8000;

// セッション・スケジュール系ページを示すURLパターン
const SESSION_URL_PATTERNS = [
  /session/i, /schedule/i, /live/i, /event/i, /calendar/i,
  /news/i, /info/i, /concert/i, /program/i, /performance/i,
  /セッション/, /スケジュール/, /ライブ/, /イベント/, /お知らせ/,
];

// セッション・スケジュール系ページを示すリンクテキストパターン
const SESSION_TEXT_PATTERNS = [
  /セッション/, /スケジュール/, /ライブ情報/, /イベント/, /お知らせ/,
  /営業案内/, /開催/, /出演/, /schedule/i, /session/i, /live/i, /event/i,
];

export interface FetchResult {
  markdown: string;
  title: string;
  url: string;
}

export interface FetchResultWithLinks extends FetchResult {
  /** 同一ドメイン内のセッション・スケジュール系ページ候補URL */
  sessionPageLinks: string[];
}

/** HTML文字列からMarkdownに変換する（Readabilityで本文抽出） */
function htmlToMarkdown(html: string, pageUrl: string, fallbackTitle: string): FetchResult {
  const dom = new JSDOM(html, { url: pageUrl });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  let markdown: string;
  let title: string;

  if (article?.content) {
    title = article.title || fallbackTitle;
    markdown = turndown.turndown(article.content);
  } else {
    title = fallbackTitle;
    // Readability失敗時は innerText をフォールバックとして使用
    const bodyText = dom.window.document.body?.textContent ?? '';
    markdown = bodyText.replace(/\n{3,}/g, '\n\n').trim();
  }

  if (markdown.length > MAX_CHARS) {
    markdown = markdown.slice(0, MAX_CHARS) + '\n\n...(省略)';
  }

  return { markdown, title, url: pageUrl };
}

/** 同一ドメインのリンクのうちセッション系ページっぽいものを抽出する */
function extractSessionLinks(html: string, baseUrl: string): string[] {
  const baseHost = new URL(baseUrl).hostname;
  const dom = new JSDOM(html, { url: baseUrl });
  const links = dom.window.document.querySelectorAll('a[href]');
  const candidates = new Set<string>();

  for (const link of Array.from(links)) {
    const href = (link as HTMLAnchorElement).href;
    const text = (link.textContent ?? '').trim();

    let parsed: URL;
    try { parsed = new URL(href); } catch { continue; }

    // 同一ドメインの内部リンクのみ
    if (parsed.hostname !== baseHost) continue;
    // メインURLと同じパスは除外
    const normalized = parsed.origin + parsed.pathname.replace(/\/$/, '');
    const baseNormalized = new URL(baseUrl).origin + new URL(baseUrl).pathname.replace(/\/$/, '');
    if (normalized === baseNormalized) continue;
    // フラグメントのみの場合は除外
    if (!parsed.pathname || parsed.pathname === '/') continue;

    const urlMatches = SESSION_URL_PATTERNS.some(p => p.test(parsed.pathname));
    const textMatches = SESSION_TEXT_PATTERNS.some(p => p.test(text));

    if (urlMatches || textMatches) {
      candidates.add(parsed.origin + parsed.pathname);
    }
  }

  return Array.from(candidates).slice(0, 5); // 最大5件
}

/**
 * URLからページを取得し、クリーンなMarkdownテキストを返す。
 * Playwrightで描画してからReadabilityで本文抽出するので、
 * JavaScriptが多いページも、ナビゲーション等のノイズも除去できる。
 */
export async function fetchPageAsMarkdown(url: string): Promise<FetchResult> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; NearJamBot/1.0; +https://nearjam.example.com/bot)',
      locale: 'ja-JP',
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    const html = await page.content();
    const pageUrl = page.url();
    const title = await page.title();

    return htmlToMarkdown(html, pageUrl, title);
  } finally {
    await browser.close();
  }
}

/**
 * 会場URLをクロールし、メインページのMarkdownとセッション系サブページ候補URLを返す。
 * ブラウザを1回しか起動しないためfetchPageAsMarkdownより効率的。
 */
export async function fetchPageWithSessionLinks(url: string): Promise<FetchResultWithLinks> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; NearJamBot/1.0; +https://nearjam.example.com/bot)',
      locale: 'ja-JP',
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    const html = await page.content();
    const pageUrl = page.url();
    const title = await page.title();

    const main = htmlToMarkdown(html, pageUrl, title);
    const sessionPageLinks = extractSessionLinks(html, pageUrl);

    return { ...main, sessionPageLinks };
  } finally {
    await browser.close();
  }
}

/**
 * 同一ブラウザインスタンスで複数URLを順次取得する（バッチ効率化用）。
 * ブラウザ起動1回分のオーバーヘッドで複数ページを処理できる。
 */
export async function fetchMultiplePages(
  urls: string[],
): Promise<FetchResult[]> {
  if (urls.length === 0) return [];

  const browser = await chromium.launch({ headless: true });
  const results: FetchResult[] = [];

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; NearJamBot/1.0; +https://nearjam.example.com/bot)',
      locale: 'ja-JP',
    });
    const page = await context.newPage();

    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 });
        await page.waitForTimeout(1500);

        const html = await page.content();
        const pageUrl = page.url();
        const title = await page.title();

        results.push(htmlToMarkdown(html, pageUrl, title));
      } catch {
        // 個別ページのエラーはスキップ（次のURLへ）
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}
