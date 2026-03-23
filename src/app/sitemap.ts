import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://nearjam.ebisuda.net';
const LOCALES = ['ja', 'en'] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [venues, upcomingSessions, studios] = await Promise.all([
    prisma.venue.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.jamSession.findMany({
      where: { startsAt: { gte: new Date() } },
      select: { id: true, updatedAt: true },
      orderBy: { startsAt: 'asc' },
      take: 500,
    }),
    prisma.studio.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  const staticPages = ['', '/venues', '/sessions', '/studios'] as const;

  const staticUrls: MetadataRoute.Sitemap = staticPages.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}${path}`,
      changeFrequency: 'daily' as const,
      priority: path === '' ? 1.0 : 0.8,
    }))
  );

  const venueUrls: MetadataRoute.Sitemap = venues.flatMap((venue) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}/venues/${venue.id}`,
      lastModified: venue.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  );

  const sessionUrls: MetadataRoute.Sitemap = upcomingSessions.flatMap((session) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}/sessions/${session.id}`,
      lastModified: session.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  );

  const studioUrls: MetadataRoute.Sitemap = studios.flatMap((studio) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}/studios/${studio.id}`,
      lastModified: studio.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }))
  );

  return [...staticUrls, ...venueUrls, ...sessionUrls, ...studioUrls];
}
