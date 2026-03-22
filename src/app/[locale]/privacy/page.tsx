import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('privacyTitle'), description: t('privacyDesc') };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (locale === 'ja') return <PrivacyJa />;
  return <PrivacyEn />;
}

function PrivacyEn() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mb-8 text-sm text-gray-500">Last updated: March 22, 2026</p>

      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">1. Overview</h2>
          <p>
            NearJam (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the website{' '}
            <a href="https://nearjam.ebisuda.net" className="text-violet-600 hover:underline">
              nearjam.ebisuda.net
            </a>{' '}
            (the &quot;Service&quot;). This Privacy Policy explains how we collect, use, and
            protect your personal information when you use the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">2. Information We Collect</h2>
          <p className="mb-2">
            When you sign in with Google, we receive and store the following information from your
            Google account:
          </p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Email address</li>
            <li>Display name</li>
            <li>Profile photo URL</li>
          </ul>
          <p className="mt-3">
            We also collect information you voluntarily provide when using the Service, such as your
            musician profile, instrument preferences, and area information.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">3. How We Use Your Information</h2>
          <p className="mb-2">We use the collected information to:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Create and manage your account</li>
            <li>Help you find jam sessions and venues near you</li>
            <li>Connect you with other musicians</li>
            <li>Send you relevant notifications (with your consent)</li>
            <li>Improve the Service</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">4. Data Storage and Security</h2>
          <p>
            Your data is stored in a secure Azure PostgreSQL database hosted in Japan. We implement
            appropriate technical and organizational measures to protect your personal information
            against unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">5. Data Sharing</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties. Information
            is only shared as necessary to operate the Service (e.g., infrastructure providers).
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">6. Your Rights</h2>
          <p className="mb-2">You have the right to:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your account and associated data</li>
            <li>Withdraw consent at any time by deleting your account</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">7. Analytics</h2>
          <p>
            We use Google Analytics (ID: G-S7Q6G0HRCV) to analyze site usage. Google Analytics
            uses cookies to collect anonymous data. You can opt out by disabling cookies in your
            browser. See the{' '}
            <a href="https://marketingplatform.google.com/about/analytics/terms/us/" className="text-violet-600 hover:underline">
              Google Analytics Terms of Service
            </a>.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">8. Advertising</h2>
          <p>
            We use Google AdSense (Publisher ID: ca-pub-9817070969559871) to display advertisements.
            Google AdSense may use cookies to show ads based on your interests. You can manage your
            ad preferences at{' '}
            <a href="https://adssettings.google.com/" className="text-violet-600 hover:underline">
              Google Ads Settings
            </a>.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">9. Cookies</h2>
          <p>
            We use cookies for session management (login state), analytics (Google Analytics),
            and advertising (Google AdSense). You can disable cookies in your browser settings,
            but some features may not work properly.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any
            significant changes by posting the new policy on this page with an updated date.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">11. Contact</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at{' '}
            <a href="mailto:ebibibi@gmail.com" className="text-violet-600 hover:underline">
              ebibibi@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}

function PrivacyJa() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">プライバシーポリシー</h1>
      <p className="mb-8 text-sm text-gray-500">最終更新日: 2026年3月22日</p>

      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">1. 概要</h2>
          <p>
            NearJam（以下「当サービス」）は、ウェブサイト{' '}
            <a href="https://nearjam.ebisuda.net" className="text-violet-600 hover:underline">
              nearjam.ebisuda.net
            </a>{' '}
            を運営しています。本プライバシーポリシーは、当サービスをご利用いただく際に収集・利用・保護する個人情報について説明します。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">2. 収集する情報</h2>
          <p className="mb-2">
            Googleアカウントでサインインした際、以下の情報をGoogleから受け取り保存します：
          </p>
          <ul className="ml-6 list-disc space-y-1">
            <li>メールアドレス</li>
            <li>表示名</li>
            <li>プロフィール写真のURL</li>
          </ul>
          <p className="mt-3">
            また、ミュージシャンプロフィール、楽器の好み、エリア情報など、サービス利用時に任意でご入力いただいた情報も収集します。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">3. 情報の利用目的</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>アカウントの作成・管理</li>
            <li>近隣のジャムセッションや会場の検索支援</li>
            <li>ミュージシャン同士のマッチング</li>
            <li>関連する通知の送信（同意した場合）</li>
            <li>サービスの改善</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">4. データの保管とセキュリティ</h2>
          <p>
            データは日本にホストされたAzure PostgreSQLデータベースに安全に保存されます。
            不正アクセス・改ざん・漏洩・破損から個人情報を保護するための適切な技術的・組織的対策を講じています。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">5. 第三者への提供</h2>
          <p>
            個人情報を第三者に販売・譲渡・貸し出しすることはありません。
            サービス運営に必要な範囲（インフラ事業者等）に限り情報を共有する場合があります。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">6. ご利用者の権利</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>保有する個人情報へのアクセス</li>
            <li>不正確な情報の修正要求</li>
            <li>アカウントおよび関連データの削除要求</li>
            <li>アカウント削除によるいつでもの同意撤回</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">7. アクセス解析</h2>
          <p>
            当サービスでは、Google Analytics（測定ID: G-S7Q6G0HRCV）を使用してサイトの利用状況を分析しています。
            Google Analyticsは匿名データの収集にCookieを使用します。ブラウザの設定でCookieを無効にすることでオプトアウトできます。
            <a href="https://marketingplatform.google.com/about/analytics/terms/jp/" className="text-violet-600 hover:underline">
              Google Analyticsの利用規約
            </a>もご確認ください。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">8. 広告配信</h2>
          <p>
            当サービスでは、Google AdSense（パブリッシャーID: ca-pub-9817070969559871）による広告配信を行っています。
            Google AdSenseはユーザーの興味に基づいた広告を表示するためにCookieを使用する場合があります。
            <a href="https://adssettings.google.com/" className="text-violet-600 hover:underline">
              Google広告設定
            </a>から設定を変更できます。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">9. Cookie</h2>
          <p>
            セッション管理（ログイン状態）、アクセス解析（Google Analytics）、
            広告配信（Google AdSense）のためにCookieを使用します。
            ブラウザの設定でCookieを無効にできますが、一部機能が正常に動作しない場合があります。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">10. ポリシーの変更</h2>
          <p>
            本ポリシーは随時更新される場合があります。
            重要な変更がある場合は、このページに更新日とともに掲載してお知らせします。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">11. お問い合わせ</h2>
          <p>
            本ポリシーに関するご質問は{' '}
            <a href="mailto:ebibibi@gmail.com" className="text-violet-600 hover:underline">
              ebibibi@gmail.com
            </a>{' '}
            までご連絡ください。
          </p>
        </section>
      </div>
    </div>
  );
}
