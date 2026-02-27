// Root Layout — [locale]/layout.tsx に委譲するシェル
// next-intl では [locale]/layout.tsx が <html lang="..."> を担当する
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
