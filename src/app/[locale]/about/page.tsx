import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ja' ? 'サイトについて - NearJam' : 'About - NearJam',
    description:
      locale === 'ja'
        ? 'NearJamについて'
        : 'About NearJam',
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (locale === 'ja') return <AboutJa />;
  return <AboutEn />;
}

function AboutEn() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">About NearJam</h1>

      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">What is NearJam?</h2>
          <p>
            NearJam is a platform that helps musicians discover jazz jam session venues,
            connect with other musicians, and track their performance history. Find jam
            sessions near you and join the community.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Operator</h2>
          <p>Masahiko Ebisuda</p>
          <p className="mt-2">
            Microsoft MVP since 2014. Based in Tokyo, Japan. Passionate about both
            technology and music.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Contact</h2>
          <p>
            For questions or feedback, please visit our{' '}
            <a href="/contact" className="text-violet-600 hover:underline">
              contact page
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Related Sites</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>
              <a href="https://ebisuda.net" className="text-violet-600 hover:underline">
                ebisuda.net
              </a>{' '}
              — Main website
            </li>
            <li>
              <a href="https://tech.ebisuda.net" className="text-violet-600 hover:underline">
                Tech News JP
              </a>{' '}
              — Tech news in Japanese
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function AboutJa() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">サイトについて</h1>

      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">NearJamとは</h2>
          <p>
            NearJamは、ミュージシャンがジャズジャムセッション会場を探し、他のミュージシャンとつながり、
            演奏履歴を記録するためのプラットフォームです。近くのジャムセッションを見つけて、
            コミュニティに参加しましょう。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">運営者</h2>
          <p>胡田 昌彦（えびすだ まさひこ）</p>
          <p className="mt-2">
            2014年からMicrosoft MVP連続受賞。東京在住。テクノロジーと音楽の両方に情熱を持っています。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">お問い合わせ</h2>
          <p>
            ご質問・ご意見は{' '}
            <a href="/contact" className="text-violet-600 hover:underline">
              お問い合わせページ
            </a>{' '}
            からどうぞ。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">関連サイト</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>
              <a href="https://ebisuda.net" className="text-violet-600 hover:underline">
                ebisuda.net
              </a>{' '}
              — メインサイト
            </li>
            <li>
              <a href="https://tech.ebisuda.net" className="text-violet-600 hover:underline">
                Tech News JP
              </a>{' '}
              — 海外の技術ニュースを日本語で
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
