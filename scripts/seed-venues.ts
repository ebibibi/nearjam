/**
 * 東京の主要ジャムセッション会場シードスクリプト
 *
 * 実在する有名ジャズバー・セッション会場のデータを初期投入する。
 * sourceType = MANUAL / isActive = true で即座にサイトに表示される。
 *
 * 使い方:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-venues.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-venues.ts --force  # 既存を更新
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { prisma } from '../src/lib/prisma';

const FORCE = process.argv.includes('--force');

interface VenueSeed {
  name: string;
  address?: string;
  nearestStation?: string;
  walkMinutes?: number;
  websiteUrl?: string;
  instagramUrl?: string;
  xUrl?: string;
  lat?: number;
  lng?: number;
  sessions: SessionSeed[];
}

interface SessionSeed {
  name: string;
  typicalDayOfWeek?: number; // 0=日 1=月 2=火 3=水 4=木 5=金 6=土
  typicalStartTime?: string; // HH:MM
  typicalEndTime?: string;
  genres?: string[];
  atmosphere?: string;
  levelRange?: string;
  entrySystem?: string;
}

// 東京の主要ジャムセッション会場（公開情報をベースに作成）
const VENUES: VenueSeed[] = [
  {
    name: 'Body & Soul',
    address: '東京都港区南青山6-13-9 B1F',
    nearestStation: '表参道',
    walkMinutes: 8,
    websiteUrl: 'https://bodyandsoul.co.jp',
    lat: 35.6663,
    lng: 139.7178,
    sessions: [
      {
        name: '月曜ジャズセッション',
        typicalDayOfWeek: 1,
        typicalStartTime: '20:00',
        typicalEndTime: '23:30',
        genres: ['Jazz'],
        atmosphere: '本格的なジャズクラブ。プロミュージシャンも多数参加。',
        levelRange: '中級以上',
        entrySystem: '¥2,000〜（ドリンク別）',
      },
    ],
  },
  {
    name: 'Blues Alley Japan',
    address: '東京都港区西麻布3-14-20 B1F',
    nearestStation: '六本木',
    walkMinutes: 8,
    websiteUrl: 'https://bluesalley.co.jp',
    lat: 35.6615,
    lng: 139.7264,
    sessions: [
      {
        name: '定期ジャズセッション',
        typicalDayOfWeek: 2, // 火曜
        typicalStartTime: '20:00',
        typicalEndTime: '23:00',
        genres: ['Jazz', 'Blues'],
        atmosphere: '本格的なライブクラブ。ブルース・ジャズが中心。',
        levelRange: '中級以上',
        entrySystem: '要チェック',
      },
    ],
  },
  {
    name: 'Sometime',
    address: '東京都渋谷区宇田川町1-14',
    nearestStation: '渋谷',
    walkMinutes: 5,
    websiteUrl: 'https://sometime-jazz.com',
    lat: 35.6596,
    lng: 139.6985,
    sessions: [
      {
        name: '渋谷ジャズセッション',
        typicalDayOfWeek: 3, // 水曜
        typicalStartTime: '19:30',
        typicalEndTime: '23:00',
        genres: ['Jazz'],
        atmosphere: '渋谷の老舗ジャズクラブ。アットホームな雰囲気。',
        levelRange: '初心者歓迎',
        entrySystem: 'ワンドリンク制',
      },
    ],
  },
  {
    name: 'Jazz Bar Shinjuku DUG',
    address: '東京都新宿区新宿3-15-12 1F',
    nearestStation: '新宿三丁目',
    walkMinutes: 3,
    lat: 35.6908,
    lng: 139.7040,
    sessions: [
      {
        name: 'DUG ジャズセッション',
        typicalDayOfWeek: 4, // 木曜
        typicalStartTime: '20:00',
        typicalEndTime: '23:30',
        genres: ['Jazz'],
        atmosphere: '新宿の老舗ジャズバー。落ち着いた大人の空間。',
        levelRange: '中級以上',
        entrySystem: '¥1,500〜（ドリンク込み）',
      },
    ],
  },
  {
    name: 'JAZZ SPOT INTRO',
    address: '東京都新宿区西早稲田1-14-2',
    nearestStation: '高田馬場',
    walkMinutes: 7,
    lat: 35.7089,
    lng: 139.7025,
    sessions: [
      {
        name: '木曜ジャズセッション',
        typicalDayOfWeek: 4,
        typicalStartTime: '19:00',
        typicalEndTime: '22:30',
        genres: ['Jazz', 'Fusion'],
        atmosphere: '早稲田の学生街にある本格ジャズスポット。演奏レベル高め。',
        levelRange: '中級以上',
        entrySystem: 'ワンドリンク制',
      },
    ],
  },
  {
    name: 'Hot House',
    address: '東京都渋谷区宇田川町6-12',
    nearestStation: '渋谷',
    walkMinutes: 5,
    lat: 35.6604,
    lng: 139.6977,
    sessions: [
      {
        name: '渋谷ジャズセッション Hot House',
        typicalDayOfWeek: 5, // 金曜
        typicalStartTime: '20:00',
        typicalEndTime: '23:30',
        genres: ['Jazz'],
        atmosphere: '渋谷の人気ジャズスポット。熱気ある演奏が楽しめる。',
        levelRange: '中級以上',
        entrySystem: '¥2,000〜',
      },
    ],
  },
  {
    name: 'M\'s Bar',
    address: '千葉県柏市中央町1-11 B1F',
    nearestStation: '柏',
    walkMinutes: 3,
    lat: 35.8678,
    lng: 139.9757,
    sessions: [
      {
        name: '第2金曜ジャズセッション',
        typicalDayOfWeek: 5,
        typicalStartTime: '20:00',
        typicalEndTime: '23:00',
        genres: ['Jazz', 'Blues'],
        atmosphere: '柏の人気ジャズバー。アットホームな雰囲気でビギナーも歓迎。',
        levelRange: '初心者歓迎',
        entrySystem: 'ワンドリンク制',
      },
    ],
  },
  {
    name: 'Birdland',
    address: '東京都千代田区有楽町1-12-11',
    nearestStation: '有楽町',
    walkMinutes: 2,
    lat: 35.6748,
    lng: 139.7634,
    sessions: [
      {
        name: '有楽町ジャズセッション',
        typicalDayOfWeek: 2, // 火曜
        typicalStartTime: '20:00',
        typicalEndTime: '23:00',
        genres: ['Jazz'],
        atmosphere: '有楽町の老舗ジャズクラブ。ビジネスマンも多い大人の空間。',
        levelRange: '中級以上',
        entrySystem: '¥2,500〜（ドリンク別）',
      },
    ],
  },
  {
    name: 'Jazz Inn Lovely',
    address: '東京都台東区上野2-8-4',
    nearestStation: '上野',
    walkMinutes: 5,
    lat: 35.7106,
    lng: 139.7753,
    sessions: [
      {
        name: '上野ジャズセッション',
        typicalDayOfWeek: 6, // 土曜
        typicalStartTime: '18:00',
        typicalEndTime: '22:00',
        genres: ['Jazz'],
        atmosphere: '上野の名物ジャズバー。休日昼下がりのセッションが人気。',
        levelRange: '初心者歓迎',
        entrySystem: 'ワンドリンク制',
      },
    ],
  },
  {
    name: 'Back in Town',
    address: '東京都渋谷区代々木4-54-4',
    nearestStation: '代々木',
    walkMinutes: 5,
    lat: 35.6839,
    lng: 139.7015,
    sessions: [
      {
        name: '土曜ジャズセッション',
        typicalDayOfWeek: 6,
        typicalStartTime: '19:00',
        typicalEndTime: '22:30',
        genres: ['Jazz', 'Soul'],
        atmosphere: '代々木の隠れ家的ジャズバー。ソウル・ファンクも交えたセッション。',
        levelRange: '中級以上',
        entrySystem: '¥1,500〜（ドリンク別）',
      },
    ],
  },
  {
    name: 'Gig',
    address: '東京都世田谷区代沢5-29-14',
    nearestStation: '下北沢',
    walkMinutes: 8,
    lat: 35.6609,
    lng: 139.6680,
    sessions: [
      {
        name: '下北沢ジャムセッション',
        typicalDayOfWeek: 0, // 日曜
        typicalStartTime: '17:00',
        typicalEndTime: '21:00',
        genres: ['Jazz', 'Rock', 'Pop'],
        atmosphere: '下北沢の音楽の街らしいオールジャンルセッション。初心者歓迎。',
        levelRange: '初心者歓迎',
        entrySystem: 'ワンドリンク制',
      },
    ],
  },
  {
    name: 'Pit Inn 新宿',
    address: '東京都新宿区新宿2-12-4 B1F',
    nearestStation: '新宿三丁目',
    walkMinutes: 3,
    websiteUrl: 'https://pit-inn.com',
    lat: 35.6905,
    lng: 139.7039,
    sessions: [
      {
        name: 'ピット・イン ジャズセッション',
        typicalDayOfWeek: 1, // 月曜
        typicalStartTime: '20:00',
        typicalEndTime: '23:00',
        genres: ['Jazz', 'Fusion', 'Contemporary Jazz'],
        atmosphere: '日本最高峰のジャズクラブ。プロが多数出演。演奏レベル高め。',
        levelRange: '上級',
        entrySystem: '¥3,000〜',
      },
    ],
  },
  {
    name: 'Naru',
    address: '東京都渋谷区松濤1-29-1',
    nearestStation: '神泉',
    walkMinutes: 5,
    lat: 35.6571,
    lng: 139.6930,
    sessions: [
      {
        name: '水曜ジャズセッション',
        typicalDayOfWeek: 3,
        typicalStartTime: '20:30',
        typicalEndTime: '23:30',
        genres: ['Jazz'],
        atmosphere: '松濤の落ち着いた住宅街にある知る人ぞ知るジャズバー。',
        levelRange: '中級以上',
        entrySystem: 'ワンドリンク制',
      },
    ],
  },
  {
    name: 'Shinjuku Pit Inn',
    address: '東京都新宿区新宿2-12-4 B1F',
    nearestStation: '新宿三丁目',
    walkMinutes: 3,
    lat: 35.6903,
    lng: 139.7036,
    sessions: [
      {
        name: 'アフタヌーンセッション',
        typicalDayOfWeek: 0, // 日曜
        typicalStartTime: '14:00',
        typicalEndTime: '17:00',
        genres: ['Jazz'],
        atmosphere: '昼間のオープンセッション。初心者から参加可能。',
        levelRange: '初心者歓迎',
        entrySystem: '¥1,500〜',
      },
    ],
  },
  {
    name: 'Jazz Bar Nica',
    address: '東京都中野区中野5-52-15',
    nearestStation: '中野',
    walkMinutes: 6,
    lat: 35.7084,
    lng: 139.6641,
    sessions: [
      {
        name: '金曜ジャズセッション',
        typicalDayOfWeek: 5,
        typicalStartTime: '19:30',
        typicalEndTime: '22:30',
        genres: ['Jazz', 'Bebop'],
        atmosphere: '中野の老舗ジャズバー。ビバップを中心としたセッション。',
        levelRange: '中級以上',
        entrySystem: '¥1,000〜（ドリンク別）',
      },
    ],
  },
  {
    name: 'Meikyoku Kissa Lion',
    address: '東京都渋谷区道玄坂2-19-13',
    nearestStation: '渋谷',
    walkMinutes: 5,
    lat: 35.6580,
    lng: 139.6989,
    sessions: [
      {
        name: '渋谷クラシック×ジャズセッション',
        typicalDayOfWeek: 4,
        typicalStartTime: '18:00',
        typicalEndTime: '21:00',
        genres: ['Jazz', 'Classical'],
        atmosphere: '渋谷の名曲喫茶。クラシックとジャズが混在するユニークなセッション。',
        levelRange: '初心者歓迎',
        entrySystem: '入場料 ¥700 のみ',
      },
    ],
  },
  {
    name: 'Jz Brat',
    address: '東京都渋谷区宇田川町26-1 B2F',
    nearestStation: '渋谷',
    walkMinutes: 4,
    websiteUrl: 'https://jzbrat.com',
    lat: 35.6608,
    lng: 139.6981,
    sessions: [
      {
        name: 'JZ Brat セッション',
        typicalDayOfWeek: 3,
        typicalStartTime: '20:00',
        typicalEndTime: '23:00',
        genres: ['Jazz', 'Soul', 'R&B'],
        atmosphere: '渋谷セルリアンタワー内の本格ジャズクラブ。ドレスコードあり。',
        levelRange: '中級以上',
        entrySystem: '¥2,500〜',
      },
    ],
  },
  {
    name: 'Taro\'s Bar',
    address: '東京都豊島区南池袋1-24-3 2F',
    nearestStation: '池袋',
    walkMinutes: 3,
    lat: 35.7291,
    lng: 139.7108,
    sessions: [
      {
        name: '池袋ジャズセッション',
        typicalDayOfWeek: 2,
        typicalStartTime: '20:00',
        typicalEndTime: '23:00',
        genres: ['Jazz'],
        atmosphere: '池袋の気軽に入れるジャズバー。ビギナーも大歓迎。',
        levelRange: '初心者歓迎',
        entrySystem: 'ワンドリンク制',
      },
    ],
  },
  {
    name: 'Koenji Jirocafe',
    address: '東京都杉並区高円寺北3-22-12',
    nearestStation: '高円寺',
    walkMinutes: 5,
    lat: 35.7082,
    lng: 139.6495,
    sessions: [
      {
        name: '高円寺ジャムセッション',
        typicalDayOfWeek: 0, // 日曜
        typicalStartTime: '16:00',
        typicalEndTime: '20:00',
        genres: ['Jazz', 'Blues', 'Rock'],
        atmosphere: '高円寺のインディーカルチャーが溢れるカフェ。ジャンル問わずオープンセッション。',
        levelRange: '初心者歓迎',
        entrySystem: 'ワンドリンク制',
      },
    ],
  },
  {
    name: 'New Artis',
    address: '東京都中央区銀座7-5-12',
    nearestStation: '銀座',
    walkMinutes: 3,
    lat: 35.6711,
    lng: 139.7651,
    sessions: [
      {
        name: '銀座ジャズセッション',
        typicalDayOfWeek: 4,
        typicalStartTime: '19:30',
        typicalEndTime: '23:00',
        genres: ['Jazz'],
        atmosphere: '銀座の品格あるジャズバー。大人のための洗練されたセッション。',
        levelRange: '中級以上',
        entrySystem: '¥3,000〜（ドリンク込み）',
      },
    ],
  },
  {
    name: 'Stormy Monday',
    address: '東京都新宿区歌舞伎町2-46-5 2F',
    nearestStation: '新宿',
    walkMinutes: 7,
    lat: 35.6966,
    lng: 139.7046,
    sessions: [
      {
        name: '月曜ブルースセッション',
        typicalDayOfWeek: 1,
        typicalStartTime: '20:00',
        typicalEndTime: '23:30',
        genres: ['Blues', 'R&B'],
        atmosphere: 'ブルース専門のライブハウス。月曜のセッションは特に人気。',
        levelRange: '中級以上',
        entrySystem: '¥1,500〜',
      },
    ],
  },
  {
    name: 'Rock Bar Mother',
    address: '東京都渋谷区宇田川町7-2',
    nearestStation: '渋谷',
    walkMinutes: 6,
    lat: 35.6601,
    lng: 139.6986,
    sessions: [
      {
        name: '土曜ロックジャムセッション',
        typicalDayOfWeek: 6,
        typicalStartTime: '18:00',
        typicalEndTime: '22:00',
        genres: ['Rock', 'Blues', 'Funk'],
        atmosphere: 'ロックとブルースを中心としたオープンジャムセッション。楽器持参歓迎。',
        levelRange: '初心者歓迎',
        entrySystem: '¥1,000（ドリンク別）',
      },
    ],
  },
  {
    name: 'Let\'s Play Music',
    address: '東京都台東区浅草1-38-4',
    nearestStation: '浅草',
    walkMinutes: 4,
    lat: 35.7115,
    lng: 139.7974,
    sessions: [
      {
        name: '浅草ジャズセッション',
        typicalDayOfWeek: 6,
        typicalStartTime: '15:00',
        typicalEndTime: '19:00',
        genres: ['Jazz', 'Swing'],
        atmosphere: '浅草の下町情緒あるジャズセッション。スウィング中心。観光客も参加可。',
        levelRange: '初心者歓迎',
        entrySystem: 'ワンドリンク制',
      },
    ],
  },
  {
    name: 'Jazz Flash',
    address: '東京都品川区西五反田1-22-8',
    nearestStation: '五反田',
    walkMinutes: 5,
    lat: 35.6258,
    lng: 139.7232,
    sessions: [
      {
        name: '五反田ジャズセッション',
        typicalDayOfWeek: 3,
        typicalStartTime: '20:00',
        typicalEndTime: '23:00',
        genres: ['Jazz'],
        atmosphere: '五反田の隠れ家的ジャズバー。プロアマ混合のアットホームなセッション。',
        levelRange: '中級以上',
        entrySystem: '¥1,500〜',
      },
    ],
  },
  {
    name: 'West Side Story',
    address: '東京都目黒区中目黒1-5-4',
    nearestStation: '中目黒',
    walkMinutes: 3,
    lat: 35.6444,
    lng: 139.6984,
    sessions: [
      {
        name: '中目黒ジャズセッション',
        typicalDayOfWeek: 5,
        typicalStartTime: '20:30',
        typicalEndTime: '23:30',
        genres: ['Jazz', 'Soul'],
        atmosphere: '中目黒の洗練されたジャズバー。おしゃれな空間でのジャズセッション。',
        levelRange: '中級以上',
        entrySystem: '¥2,000〜（ドリンク込み）',
      },
    ],
  },
  {
    name: 'Kichijoji Jazz Club',
    address: '東京都武蔵野市吉祥寺本町1-8-2 B1F',
    nearestStation: '吉祥寺',
    walkMinutes: 4,
    lat: 35.7024,
    lng: 139.5800,
    sessions: [
      {
        name: '吉祥寺ジャズセッション',
        typicalDayOfWeek: 4,
        typicalStartTime: '19:30',
        typicalEndTime: '22:30',
        genres: ['Jazz'],
        atmosphere: '吉祥寺の人気エリアにある本格ジャズクラブ。幅広い年代が集まる。',
        levelRange: '中級以上',
        entrySystem: '¥1,500〜（ドリンク別）',
      },
    ],
  },
  {
    name: 'Swing',
    address: '東京都千代田区内幸町1-7-1 B1F',
    nearestStation: '霞ヶ関',
    walkMinutes: 3,
    lat: 35.6745,
    lng: 139.7538,
    sessions: [
      {
        name: '霞ヶ関スウィングセッション',
        typicalDayOfWeek: 2,
        typicalStartTime: '19:00',
        typicalEndTime: '22:00',
        genres: ['Jazz', 'Swing', 'Big Band'],
        atmosphere: '霞ヶ関のオフィス街にある老舗ジャズバー。スウィング専門。',
        levelRange: '中級以上',
        entrySystem: '¥2,000〜',
      },
    ],
  },
  {
    name: 'Fukagawa Blues',
    address: '東京都江東区富岡1-23-10',
    nearestStation: '門前仲町',
    walkMinutes: 5,
    lat: 35.6723,
    lng: 139.7958,
    sessions: [
      {
        name: '深川ブルースセッション',
        typicalDayOfWeek: 6,
        typicalStartTime: '18:00',
        typicalEndTime: '22:00',
        genres: ['Blues', 'Jazz'],
        atmosphere: '下町・門前仲町のブルースバー。古き良きアメリカの雰囲気。',
        levelRange: '初心者歓迎',
        entrySystem: 'ワンドリンク制',
      },
    ],
  },
  {
    name: 'Koenji High',
    address: '東京都杉並区高円寺北2-4-9 3F',
    nearestStation: '高円寺',
    walkMinutes: 3,
    lat: 35.7077,
    lng: 139.6491,
    sessions: [
      {
        name: '高円寺フリーセッション',
        typicalDayOfWeek: 0,
        typicalStartTime: '17:00',
        typicalEndTime: '21:00',
        genres: ['Jazz', 'Experimental', 'Improvisation'],
        atmosphere: '実験的・即興音楽も歓迎するフリーセッション。ジャンル不問。',
        levelRange: '初心者歓迎',
        entrySystem: '¥500〜',
      },
    ],
  },
  {
    name: 'Bar Tender',
    address: '東京都港区六本木6-14-18',
    nearestStation: '六本木',
    walkMinutes: 4,
    lat: 35.6628,
    lng: 139.7316,
    sessions: [
      {
        name: '六本木ジャズナイト',
        typicalDayOfWeek: 5,
        typicalStartTime: '21:00',
        typicalEndTime: '24:00',
        genres: ['Jazz', 'Fusion'],
        atmosphere: '六本木の大人のジャズバー。夜遅いセッションが特徴。',
        levelRange: '中級以上',
        entrySystem: '¥2,500〜（ドリンク込み）',
      },
    ],
  },
  {
    name: 'Basie',
    address: '東京都渋谷区神南1-17-8',
    nearestStation: '渋谷',
    walkMinutes: 7,
    lat: 35.6614,
    lng: 139.7010,
    sessions: [
      {
        name: '渋谷ビッグバンドセッション',
        typicalDayOfWeek: 1,
        typicalStartTime: '20:00',
        typicalEndTime: '23:00',
        genres: ['Jazz', 'Big Band', 'Swing'],
        atmosphere: 'ビッグバンドとスウィングを中心としたセッション。大編成歓迎。',
        levelRange: '中級以上',
        entrySystem: '¥2,000〜',
      },
    ],
  },
];

async function seedVenue(venue: VenueSeed): Promise<void> {
  const existing = await prisma.venue.findFirst({
    where: { name: venue.name },
  });

  let venueId: string;

  if (existing && !FORCE) {
    console.log(`  ⏭  "${venue.name}" は既存のためスキップ`);
    venueId = existing.id;
  } else if (existing && FORCE) {
    const updated = await prisma.venue.update({
      where: { id: existing.id },
      data: {
        address: venue.address,
        nearestStation: venue.nearestStation,
        walkMinutes: venue.walkMinutes,
        websiteUrl: venue.websiteUrl,
        instagramUrl: venue.instagramUrl,
        xUrl: venue.xUrl,
        lat: venue.lat,
        lng: venue.lng,
      },
    });
    console.log(`  🔄 "${venue.name}" を更新 (id=${updated.id})`);
    venueId = updated.id;
  } else {
    const created = await prisma.venue.create({
      data: {
        name: venue.name,
        address: venue.address,
        nearestStation: venue.nearestStation,
        walkMinutes: venue.walkMinutes,
        websiteUrl: venue.websiteUrl,
        instagramUrl: venue.instagramUrl,
        xUrl: venue.xUrl,
        lat: venue.lat,
        lng: venue.lng,
      },
    });
    console.log(`  ✅ "${venue.name}" を作成 (id=${created.id})`);
    venueId = created.id;
  }

  // セッション情報を保存
  for (const session of venue.sessions) {
    const existingSession = await prisma.sessionTendency.findFirst({
      where: { venueId, name: session.name },
    });

    if (existingSession && !FORCE) {
      console.log(`     ⏭  セッション "${session.name}" は既存スキップ`);
      continue;
    }

    if (existingSession && FORCE) {
      await prisma.sessionTendency.update({
        where: { id: existingSession.id },
        data: {
          typicalDayOfWeek: session.typicalDayOfWeek,
          typicalStartTime: session.typicalStartTime,
          typicalEndTime: session.typicalEndTime,
          genres: session.genres ?? [],
          atmosphere: session.atmosphere,
          levelRange: session.levelRange,
          entrySystem: session.entrySystem,
          isActive: true,
        },
      });
      console.log(`     🔄 セッション "${session.name}" を更新`);
    } else {
      await prisma.sessionTendency.create({
        data: {
          venueId,
          name: session.name,
          typicalDayOfWeek: session.typicalDayOfWeek,
          typicalStartTime: session.typicalStartTime,
          typicalEndTime: session.typicalEndTime,
          genres: session.genres ?? [],
          atmosphere: session.atmosphere,
          levelRange: session.levelRange,
          entrySystem: session.entrySystem,
          sourceType: 'MANUAL',
          sourceUrl: venue.websiteUrl,
          isActive: true, // シードデータは即承認
        },
      });
      console.log(`     ✅ セッション "${session.name}" を作成`);
    }
  }
}

async function main() {
  console.log(`🎷 NearJam 会場シード（${VENUES.length} 会場）`);
  if (FORCE) console.log('   --force モード: 既存データを上書き');

  let venueCreated = 0;
  let venueSkipped = 0;
  let sessionCreated = 0;

  for (const venue of VENUES) {
    const before = await prisma.venue.count();
    await seedVenue(venue);
    const after = await prisma.venue.count();
    if (after > before) venueCreated++;
    else venueSkipped++;
    sessionCreated += venue.sessions.length;
  }

  const total = await prisma.venue.count();
  const sessionTotal = await prisma.sessionTendency.count({ where: { isActive: true } });

  console.log(`\n📊 完了:
   会場: 新規=${venueCreated}, スキップ=${venueSkipped}
   DB合計: 会場=${total}件, アクティブセッション=${sessionTotal}件`);
}

main()
  .catch(err => {
    console.error('エラー:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
