// Google Places API (New) — サーバーサイドのみ
// 会場の Place ID 検索と写真 URL 取得を担当する

const PLACES_BASE = 'https://places.googleapis.com/v1';

interface PlacesSearchResult {
  placeId: string;
  displayName: string;
}

interface PhotoMediaResult {
  photoUri: string;
}

/**
 * 会場名＋住所でテキスト検索し、Google Place ID を返す
 * 見つからない場合は null
 */
export async function findPlaceId(
  venueName: string,
  address: string | null,
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const query = address ? `${venueName} ${address}` : venueName;

  try {
    const res = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName',
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: 'ja',
        regionCode: 'JP',
        maxResultCount: 1,
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { places?: PlacesSearchResult[] };
    return data.places?.[0]?.placeId ?? null;
  } catch {
    return null;
  }
}

/**
 * Place ID から写真 CDN URL を最大 maxPhotos 件取得する
 * skipHttpRedirect=true を使い、APIキーが最終 URL に露出しない
 */
export async function fetchPlacePhotoUrls(
  placeId: string,
  maxPhotos = 3,
): Promise<string[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  try {
    // 1. Place Details で photos リソース名を取得
    const detailRes = await fetch(`${PLACES_BASE}/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'photos',
      },
    });

    if (!detailRes.ok) return [];

    const detail = (await detailRes.json()) as { photos?: { name: string }[] };
    const photoNames = (detail.photos ?? []).slice(0, maxPhotos).map((p) => p.name);

    if (photoNames.length === 0) return [];

    // 2. 各 photo リソース名から CDN URL を取得（skipHttpRedirect=true）
    const photoUrls = await Promise.all(
      photoNames.map(async (name) => {
        try {
          const mediaRes = await fetch(
            `${PLACES_BASE}/${name}/media?maxWidthPx=800&skipHttpRedirect=true`,
            { headers: { 'X-Goog-Api-Key': apiKey } },
          );
          if (!mediaRes.ok) return null;
          const media = (await mediaRes.json()) as PhotoMediaResult;
          return media.photoUri ?? null;
        } catch {
          return null;
        }
      }),
    );

    return photoUrls.filter((url): url is string => url !== null);
  } catch {
    return [];
  }
}
