import { chromium } from '@playwright/test';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
});

/**
 * URLからページを取得し、クリーンなMarkdownテキストを返す。
 * Playwrightで描画してからReadabilityで本文抽出するので、
 * JavaScriptが多いページも、ナビゲーション等のノイズも除去できる。
 */
export async function fetchPageAsMarkdown(url: string): Promise<{
  markdown: string;
  title: string;
  url: string;
}> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (compatible; NearJamBot/1.0; +https://nearjam.example.com/bot)',
      locale: 'ja-JP',
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    // 追加で少し待つ（遅延JS描画への対応）
    await page.waitForTimeout(2000);

    const html = await page.content();
    const pageUrl = page.url(); // リダイレクト後の最終URL

    // Readabilityで本文を抽出（広告・ナビゲーション等を除去）
    const dom = new JSDOM(html, { url: pageUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    let markdown: string;
    let title: string;

    if (article && article.content) {
      title = article.title || '';
      markdown = turndown.turndown(article.content);
    } else {
      // Readabilityが失敗した場合は body の innerText をフォールバックとして使う
      title = await page.title();
      const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
      markdown = bodyText.replace(/\n{3,}/g, '\n\n').trim();
    }

    // 長すぎるページは先頭8000文字に切る（LLMのトークン節約）
    const MAX_CHARS = 8000;
    if (markdown.length > MAX_CHARS) {
      markdown = markdown.slice(0, MAX_CHARS) + '\n\n...(省略)';
    }

    return { markdown, title, url: pageUrl };
  } finally {
    await browser.close();
  }
}
