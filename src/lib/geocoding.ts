// Google Maps Geocoding API — サーバーサイドのみ
// DB に lat/lng がある場合は API を呼ばない（キャッシュ済み）

interface GeoResult {
  lat: number;
  lng: number;
}

export async function geocodeAddress(address: string): Promise<GeoResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) return null;

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('language', 'ja');
    url.searchParams.set('region', 'jp');

    const res = await fetch(url.toString(), { next: { revalidate: 86400 } }); // 1日キャッシュ
    const data = await res.json();

    if (data.status === 'OK' && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
  } catch {
    // Geocoding 失敗は致命的エラーではない — null を返す
  }

  return null;
}
