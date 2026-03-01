import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('termsTitle'), description: t('termsDesc') };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (locale === 'ja') return <TermsJa />;
  return <TermsEn />;
}

function TermsEn() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mb-8 text-sm text-gray-500">Last updated: February 28, 2026</p>

      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
          <p>
            By accessing or using NearJam (&quot;the Service&quot;), you agree to be bound by
            these Terms of Service. If you do not agree to these terms, please do not use the
            Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">2. Description of Service</h2>
          <p>
            NearJam is a platform that helps musicians discover jazz jam session venues, connect
            with other musicians, and track their performance history. Venue and session
            information is collected automatically from public sources and may not always be
            up to date.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">3. User Accounts</h2>
          <p className="mb-2">To use certain features of the Service, you must sign in with a Google account. You agree to:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Provide accurate and complete information</li>
            <li>Keep your account information up to date</li>
            <li>Not share your account with others</li>
            <li>Notify us immediately of any unauthorized use of your account</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">4. User Conduct</h2>
          <p className="mb-2">You agree not to:</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>Post false, misleading, or harmful content</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Attempt to access other users&apos; accounts without authorization</li>
            <li>Use the Service for any illegal purpose</li>
            <li>Scrape or collect data from the Service without permission</li>
            <li>Interfere with the Service&apos;s operation</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">5. Venue and Session Information</h2>
          <p>
            Venue and session information displayed on NearJam is collected from public sources
            and user contributions. We do not guarantee the accuracy, completeness, or timeliness
            of this information. Please verify details directly with the venue before attending.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">6. Intellectual Property</h2>
          <p>
            The Service and its original content (excluding user-submitted content) are owned by
            NearJam. User-submitted content remains the property of the respective users, but by
            submitting content you grant NearJam a non-exclusive license to display it on the
            Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">7. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind. We do not
            guarantee that the Service will be uninterrupted, error-free, or meet your
            requirements.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, NearJam shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of the
            Service.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Continued use of the Service
            after changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">10. Contact</h2>
          <p>
            For questions about these Terms, please contact us at{' '}
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

function TermsJa() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">利用規約</h1>
      <p className="mb-8 text-sm text-gray-500">最終更新日: 2026年2月28日</p>

      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">1. 規約への同意</h2>
          <p>
            NearJam（以下「当サービス」）にアクセスまたはご利用いただくことで、本利用規約に同意したものとみなします。
            同意いただけない場合は、当サービスのご利用をお控えください。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">2. サービスの説明</h2>
          <p>
            NearJamは、ミュージシャンがジャズジャムセッション会場を探し、他のミュージシャンとつながり、
            演奏履歴を記録するためのプラットフォームです。会場・セッション情報は公開情報から自動収集しており、
            常に最新である保証はありません。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">3. ユーザーアカウント</h2>
          <p className="mb-2">一部機能の利用にはGoogleアカウントでのサインインが必要です。以下に同意していただきます：</p>
          <ul className="ml-6 list-disc space-y-1">
            <li>正確かつ完全な情報の提供</li>
            <li>アカウント情報の最新維持</li>
            <li>アカウントの第三者への共有禁止</li>
            <li>不正利用を発見した場合の速やかな通知</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">4. 禁止事項</h2>
          <ul className="ml-6 list-disc space-y-1">
            <li>虚偽・誤解を招く・有害なコンテンツの投稿</li>
            <li>他のユーザーへのハラスメント・嫌がらせ・危害</li>
            <li>他のユーザーのアカウントへの不正アクセス</li>
            <li>違法目的でのサービス利用</li>
            <li>許可なくサービスからデータをスクレイピング・収集</li>
            <li>サービスの運営妨害</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">5. 会場・セッション情報について</h2>
          <p>
            掲載されている会場・セッション情報は公開情報およびユーザー投稿から収集しています。
            情報の正確性・完全性・最新性を保証するものではありません。
            参加前に必ず会場に直接ご確認ください。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">6. 知的財産権</h2>
          <p>
            当サービスおよびその独自コンテンツ（ユーザー投稿コンテンツを除く）はNearJamが所有します。
            ユーザー投稿コンテンツの所有権はユーザーに帰属しますが、投稿することでNearJamに
            サービス上での非独占的な表示ライセンスを付与するものとします。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">7. 免責事項</h2>
          <p>
            当サービスは「現状のまま」提供されます。サービスが中断なく・エラーなく・
            お客様の要求を満たして動作することを保証するものではありません。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">8. 責任の制限</h2>
          <p>
            法律の認める最大限の範囲において、NearJamはサービスの利用に起因する
            間接的・偶発的・特別・結果的・懲罰的損害について責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">9. 規約の変更</h2>
          <p>
            当サービスはいつでも本規約を変更する権利を留保します。
            変更後もサービスを継続してご利用いただくことで、新しい規約への同意とみなします。
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">10. お問い合わせ</h2>
          <p>
            本規約に関するご質問は{' '}
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
