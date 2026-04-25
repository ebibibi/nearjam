import pg from 'pg';
import { setTimeout } from 'timers/promises';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function cleanAddress(addr) {
  return addr
    .replace(/〒\d{3}-?\d{4}\s*/, '')
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/\s*[（(].*?[）)]\s*/g, '')
    .replace(/\s*(ビル|マンション|プラザ|タワー|ハイツ|コーポ|メゾン|パレス|レジデンス|アパート|岩崎|ダイカン).*$/i, '')
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
  const url = `https://geocode.csis.u-tokyo.ac.jp/cgi-bin/simple_geocode.cgi?charset=UTF8&addr=${encodeURIComponent(cleaned)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const xml = await res.text();
  const lat = parseFloat(extractTag(xml, 'latitude') ?? '');
  const lng = parseFloat(extractTag(xml, 'longitude') ?? '');
  const iConf = parseInt(extractTag(xml, 'iConf') ?? '0');
  if (isNaN(lat) || isNaN(lng) || iConf < 2) return null;
  return { lat, lng, confidence: iConf };
}

async function geocodeNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=jp`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NearJam/1.0 (https://nearjam.ebisuda.net)' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), confidence: 3 };
}

async function main() {
  const { rows: venues } = await pool.query(
    `SELECT id, name, address, "nearestStation" FROM "Venue" WHERE lat IS NULL ORDER BY name`
  );
  console.log(`${venues.length} venues to geocode`);

  let success = 0;
  let fail = 0;

  for (const v of venues) {
    let coords = null;

    if (v.address) {
      coords = await geocodeCsis(v.address);
    }

    if (!coords && v.nearestStation) {
      coords = await geocodeNominatim(`${v.nearestStation}駅 ${v.name}`);
      await setTimeout(1100);
    }

    if (!coords && v.name) {
      coords = await geocodeNominatim(`${v.name} ジャズバー 日本`);
      await setTimeout(1100);
    }

    if (coords) {
      await pool.query(
        `UPDATE "Venue" SET lat = $1, lng = $2 WHERE id = $3`,
        [coords.lat, coords.lng, v.id]
      );
      success++;
      console.log(`  ✅ ${v.name}: ${coords.lat}, ${coords.lng} (conf:${coords.confidence})`);
    } else {
      fail++;
      console.log(`  ❌ ${v.name} (addr: ${(v.address || 'null').slice(0, 40)})`);
    }

    await setTimeout(300);
  }

  console.log(`\nDone: ${success} geocoded, ${fail} failed (${venues.length} total)`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
