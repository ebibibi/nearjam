import pg from 'pg';
import { setTimeout } from 'timers/promises';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function cleanAddress(addr) {
  return addr
    .replace(/〒\d{3}-?\d{4}\s*/, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/\s*[（(].*?[）)]\s*/g, '')
    .replace(/\s*(ビル|マンション|プラザ|タワー|ハイツ|コーポ|メゾン|パレス|レジデンス|アパート).*$/i, '')
    .replace(/\s*\d+[階F].*$/i, '')
    .replace(/\s+/g, '')
    .trim();
}

function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const m = xml.match(re);
  return m ? m[1] : null;
}

async function geocodeCsis(address) {
  const cleaned = cleanAddress(address);
  if (cleaned.length < 5) return null;
  const url = `https://geocode.csis.u-tokyo.ac.jp/cgi-bin/simple_geocode.cgi?charset=UTF8&addr=${encodeURIComponent(cleaned)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const xml = await res.text();
    const lat = parseFloat(extractTag(xml, 'latitude') ?? '');
    const lng = parseFloat(extractTag(xml, 'longitude') ?? '');
    const iConf = parseInt(extractTag(xml, 'iConf') ?? '0');
    if (isNaN(lat) || isNaN(lng) || iConf < 2) return null;
    return { lat, lng, confidence: iConf };
  } catch { return null; }
}

async function geocodeNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=jp`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NearJam/1.0 (https://nearjam.ebisuda.net)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), confidence: 3 };
  } catch { return null; }
}

async function fetchPageText(url, maxChars = 8000) {
  try {
    const controller = new AbortController();
    const tid = globalThis.setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'NearJam-Bot/1.0 (session info collection)' },
    });
    clearTimeout(tid);
    if (!res.ok) return null;
    const html = await res.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, maxChars);
  } catch { return null; }
}

function extractAddressFromText(text) {
  const patterns = [
    /(?:住所|所在地|アクセス|address)[：:\s]*([東京都|大阪府|北海道|京都府|神奈川県|埼玉県|千葉県|愛知県|福岡県|兵庫県|宮城県|広島県|新潟県|静岡県|長野県|岡山県|石川県|沖縄県|奈良県|滋賀県|熊本県|鹿児島県|山口県|群馬県|栃木県|茨城県|三重県|岐阜県|富山県|福井県|山梨県|和歌山県|徳島県|香川県|愛媛県|高知県|大分県|宮崎県|佐賀県|長崎県|秋田県|山形県|岩手県|青森県|鳥取県|島根県][^\n,、。]{5,50})/,
    /〒\d{3}-?\d{4}\s*([^\n,、。]{5,50})/,
    /((?:東京都|大阪府|北海道|京都府|神奈川県|埼玉県|千葉県|愛知県|福岡県|兵庫県|宮城県|広島県|新潟県|静岡県|長野県|岡山県|石川県|沖縄県|奈良県|滋賀県|熊本県|鹿児島県|山口県|群馬県|栃木県|茨城県|三重県|岐阜県|富山県|福井県|山梨県|和歌山県|徳島県|香川県|愛媛県|高知県|大分県|宮崎県|佐賀県|長崎県|秋田県|山形県|岩手県|青森県|鳥取県|島根県)[^\s,、。]{5,50})/,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) return m[1].trim();
  }
  return null;
}

async function main() {
  const { rows: venues } = await pool.query(
    `SELECT id, name, "websiteUrl", "nearestStation" FROM "Venue" WHERE lat IS NULL AND "websiteUrl" IS NOT NULL ORDER BY name`
  );
  console.log(`\n🌐 Webサイトから住所抽出してジオコーディング: ${venues.length} 会場\n`);

  let success = 0;
  let fail = 0;
  const seen = new Set();

  for (const v of venues) {
    if (seen.has(v.websiteUrl)) {
      console.log(`  ⏭️ ${v.name} — URL重複スキップ`);
      continue;
    }
    seen.add(v.websiteUrl);

    const text = await fetchPageText(v.websiteUrl);
    if (!text) {
      console.log(`  ❌ ${v.name} — ページ取得失敗`);
      fail++;
      continue;
    }

    const address = extractAddressFromText(text);
    let coords = null;

    if (address) {
      coords = await geocodeCsis(address);
      if (coords) {
        console.log(`  ✅ ${v.name}: ${coords.lat}, ${coords.lng} (CSIS, addr: ${address.slice(0, 30)})`);
      }
    }

    if (!coords && address) {
      coords = await geocodeNominatim(address);
      await setTimeout(1100);
      if (coords) {
        console.log(`  ✅ ${v.name}: ${coords.lat}, ${coords.lng} (Nominatim, addr: ${address.slice(0, 30)})`);
      }
    }

    if (!coords) {
      coords = await geocodeNominatim(v.name);
      await setTimeout(1100);
      if (coords) {
        console.log(`  ✅ ${v.name}: ${coords.lat}, ${coords.lng} (Nominatim, name-only)`);
      }
    }

    if (coords) {
      await pool.query(
        `UPDATE "Venue" SET lat = $1, lng = $2${address ? ', address = $4' : ''} WHERE id = $3`,
        address ? [coords.lat, coords.lng, v.id, address] : [coords.lat, coords.lng, v.id]
      );
      success++;
    } else {
      console.log(`  ❌ ${v.name} (url: ${v.websiteUrl.slice(0, 40)}${address ? ', addr: ' + address.slice(0, 30) : ', no address found'})`);
      fail++;
    }

    await setTimeout(300);
  }

  console.log(`\n✅ 完了: ${success} 件成功 / ${fail} 件失敗\n`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
