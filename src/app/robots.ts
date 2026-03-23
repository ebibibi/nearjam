import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nearjam.ebisuda.net';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/*/auth/',
          '/*/admin/',
          '/*/profile/setup',
          '/*/sessions/*/live',
          '/*/sessions/*/edit',
          '/*/sessions/*/qr',
          '/*/sessions/*/checkin',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
