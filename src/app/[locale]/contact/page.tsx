import { setRequestLocale, getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ja' ? 'お問い合わせ - NearJam' : 'Contact - NearJam',
    description:
      locale === 'ja'
        ? 'NearJamへのお問い合わせ'
        : 'Contact NearJam',
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  if (locale === 'ja') return <ContactJa />;
  return <ContactEn />;
}

function ContactEn() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Contact</h1>

      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Email</h2>
          <p>
            <a href="mailto:ebibibi@gmail.com" className="text-violet-600 hover:underline">
              ebibibi@gmail.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Operator</h2>
          <p>Masahiko Ebisuda</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Response Time</h2>
          <p>
            We aim to respond within a few business days. Thank you for your patience.
          </p>
        </section>
      </div>
    </div>
  );
}

function ContactJa() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">お問い合わせ</h1>

      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">メール</h2>
          <p>
            <a href="mailto:ebibibi@gmail.com" className="text-violet-600 hover:underline">
              ebibibi@gmail.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">運営者</h2>
          <p>胡田昌彦</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-gray-900">回答について</h2>
          <p>
            数営業日以内の回答を目指しています。ご了承ください。
          </p>
        </section>
      </div>
    </div>
  );
}
