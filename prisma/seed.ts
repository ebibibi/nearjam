import {
  PrismaClient,
  UserRole,
  SkillLevel,
  SessionGoal,
  FeedbackPref,
  SessionStyle,
  SongDifficulty,
  SessionFormat,
  SourceType,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ─── 曲 ───────────────────────────────────────────────────────────────────

  const songs = await Promise.all([
    // ジャズスタンダード
    prisma.song.upsert({
      where: { id: "song-autumn-leaves" },
      update: {},
      create: {
        id: "song-autumn-leaves",
        title: "Autumn Leaves",
        artist: "Joseph Kosma",
        genre: "Jazz",
        typicalKey: "Gm",
        typicalBpmMin: 120,
        typicalBpmMax: 160,
        difficulty: SongDifficulty.MEDIUM,
        tags: ["jazz standard", "beginner friendly", "12/8"],
        chordwikiUrl: "https://www.chordwiki.jp/wiki/Autumn+Leaves",
        wishlistCount: 0,
        approved: true,
      },
    }),
    prisma.song.upsert({
      where: { id: "song-fly-me-to-the-moon" },
      update: {},
      create: {
        id: "song-fly-me-to-the-moon",
        title: "Fly Me to the Moon",
        artist: "Bart Howard",
        genre: "Jazz",
        typicalKey: "Am",
        typicalBpmMin: 130,
        typicalBpmMax: 180,
        difficulty: SongDifficulty.EASY,
        tags: ["jazz standard", "beginner friendly", "swing"],
        wishlistCount: 0,
        approved: true,
      },
    }),
    prisma.song.upsert({
      where: { id: "song-all-of-me" },
      update: {},
      create: {
        id: "song-all-of-me",
        title: "All of Me",
        artist: "Gerald Marks / Seymour Simons",
        genre: "Jazz",
        typicalKey: "C",
        typicalBpmMin: 120,
        typicalBpmMax: 200,
        difficulty: SongDifficulty.EASY,
        tags: ["jazz standard", "beginner friendly"],
        wishlistCount: 0,
        approved: true,
      },
    }),
    prisma.song.upsert({
      where: { id: "song-summertime" },
      update: {},
      create: {
        id: "song-summertime",
        title: "Summertime",
        artist: "George Gershwin",
        genre: "Jazz",
        typicalKey: "Am",
        typicalBpmMin: 60,
        typicalBpmMax: 80,
        difficulty: SongDifficulty.MEDIUM,
        tags: ["jazz standard", "blues", "ballad"],
        wishlistCount: 0,
        approved: true,
      },
    }),
    prisma.song.upsert({
      where: { id: "song-so-what" },
      update: {},
      create: {
        id: "song-so-what",
        title: "So What",
        artist: "Miles Davis",
        genre: "Jazz",
        typicalKey: "Dm",
        typicalBpmMin: 130,
        typicalBpmMax: 160,
        difficulty: SongDifficulty.MEDIUM,
        tags: ["modal jazz", "cool jazz", "Miles Davis"],
        wishlistCount: 0,
        approved: true,
      },
    }),
    // ロック・ポップ
    prisma.song.upsert({
      where: { id: "song-hotel-california" },
      update: {},
      create: {
        id: "song-hotel-california",
        title: "Hotel California",
        artist: "Eagles",
        genre: "Rock",
        typicalKey: "Bm",
        typicalBpmMin: 72,
        typicalBpmMax: 76,
        difficulty: SongDifficulty.MEDIUM,
        tags: ["classic rock", "guitar", "Eagles"],
        chordwikiUrl: "https://www.chordwiki.jp/wiki/Hotel+California",
        wishlistCount: 0,
        approved: true,
      },
    }),
    prisma.song.upsert({
      where: { id: "song-let-it-be" },
      update: {},
      create: {
        id: "song-let-it-be",
        title: "Let It Be",
        artist: "The Beatles",
        genre: "Rock",
        typicalKey: "C",
        typicalBpmMin: 70,
        typicalBpmMax: 76,
        difficulty: SongDifficulty.EASY,
        tags: ["beatles", "classic rock", "beginner friendly", "piano"],
        chordwikiUrl: "https://www.chordwiki.jp/wiki/Let+It+Be",
        wishlistCount: 0,
        approved: true,
      },
    }),
    // J-Pop
    prisma.song.upsert({
      where: { id: "song-yoru-ni-kakeru" },
      update: {},
      create: {
        id: "song-yoru-ni-kakeru",
        title: "夜に駆ける",
        artist: "YOASOBI",
        genre: "J-Pop",
        typicalKey: "Em",
        typicalBpmMin: 132,
        typicalBpmMax: 136,
        difficulty: SongDifficulty.MEDIUM,
        tags: ["J-Pop", "YOASOBI", "アップテンポ"],
        chordwikiUrl: "https://www.chordwiki.jp/wiki/%E5%A4%9C%E3%81%AB%E9%A7%86%E3%81%91%E3%82%8B",
        wishlistCount: 0,
        approved: true,
      },
    }),
  ]);

  console.log(`  ✓ ${songs.length} songs seeded`);

  // ─── テストユーザー ────────────────────────────────────────────────────────

  const venueUser = await prisma.user.upsert({
    where: { email: "venue-test@nearjam.test" },
    update: {},
    create: {
      email: "venue-test@nearjam.test",
      nickname: "カシワバー（テスト）",
      role: UserRole.VENUE,
    },
  });

  const musician1 = await prisma.user.upsert({
    where: { email: "musician1@nearjam.test" },
    update: {},
    create: {
      email: "musician1@nearjam.test",
      nickname: "ジャズギタリスト田中",
      role: UserRole.MUSICIAN,
    },
  });

  const musician2 = await prisma.user.upsert({
    where: { email: "musician2@nearjam.test" },
    update: {},
    create: {
      email: "musician2@nearjam.test",
      nickname: "ベーシスト鈴木",
      role: UserRole.MUSICIAN,
    },
  });

  console.log("  ✓ 3 test users seeded");

  // ─── 会場（v0.3: VenueProfile → Venue。誰でも作成可・オーナーが認証） ────────

  const venue = await prisma.venue.upsert({
    where: { id: "venue-kashiwa-bar" },
    update: {},
    create: {
      id: "venue-kashiwa-bar",
      name: "カシワバー（テスト会場）",
      address: "千葉県柏市柏1-1-1",
      nearestStation: "柏駅",
      walkMinutes: 5,
      lat: 35.8677,
      lng: 139.9750,
      rulesMarkdown: "# カシワバーへようこそ！\n\n## 基本ルール\n- 1曲につき演奏時間は5〜7分を目安に\n- 知らない曲でも歓迎。できる範囲でOK\n- 演奏中はおしゃべり控えめで\n\n## 初参加の方へ\n参加費500円（ワンドリンク込み）。まず受付でお声がけください！",
      ownerId: venueUser.id,
      verifiedAt: null, // テスト会場は未確認
    },
  });

  // v0.3: セッション傾向（口コミ投稿モデル — 複数登録可）
  await prisma.sessionTendency.upsert({
    where: { id: "tendency-kashiwa-thu-jazz" },
    update: {},
    create: {
      id: "tendency-kashiwa-thu-jazz",
      venueId: venue.id,
      name: "木曜夜のジャズセッション",
      typicalDayOfWeek: 4, // 木曜
      typicalStartTime: "19:00",
      typicalEndTime: "22:00",
      genres: ["Jazz", "ボサノバ"],
      atmosphere: "初心者歓迎。ジャズスタンダード中心。知らない曲でも歓迎の雰囲気。",
      levelRange: "初心者歓迎",
      entrySystem: "500円（ワンドリンク込み）",
      capacity: 20,
      houseEquipment: "ドラム、ピアノ、PA",
      equipmentDetails:
        "ドラム: Pearl Masters Custom / シンバル: Zildjian A Custom 14HH, 16C, 20R\n" +
        "アンプ: Fender Blues Junior (ギター用), Markbass Mini CMD 121P (ベース用)\n" +
        "PA: Yamaha EMX5 + JBL EON615 x2",
      sourceType: SourceType.OWNER_VERIFIED,
      sourceUserId: venueUser.id,
      isActive: true,
    },
  });

  // 口コミ投稿例（ミュージシャンが追加したセッション傾向）
  await prisma.sessionTendency.upsert({
    where: { id: "tendency-kashiwa-sat-rock" },
    update: {},
    create: {
      id: "tendency-kashiwa-sat-rock",
      venueId: venue.id,
      name: "土曜ロックセッション",
      typicalDayOfWeek: 6, // 土曜
      typicalStartTime: "20:00",
      typicalEndTime: "23:00",
      genres: ["Rock", "J-Pop"],
      atmosphere: "ロック・ポップ系。ビートルズからYOASOBIまで幅広くやってる印象。",
      levelRange: "中級以上",
      entrySystem: "ワンドリンク制",
      sourceType: SourceType.CROWDSOURCED,
      sourceUserId: musician1.id, // ミュージシャン田中が口コミ投稿
      isActive: true,
    },
  });

  console.log("  ✓ 1 venue + 2 session tendencies seeded");

  // ─── スタジオ（v0.3 新規）──────────────────────────────────────────────────

  const studio = await prisma.studio.upsert({
    where: { id: "studio-kashiwa-music" },
    update: {},
    create: {
      id: "studio-kashiwa-music",
      name: "柏ミュージックスタジオ（テスト）",
      address: "千葉県柏市柏2-2-2",
      nearestStation: "柏駅",
      walkMinutes: 8,
      lat: 35.8680,
      lng: 139.9760,
      websiteUrl: "https://example.com/kashiwa-studio",
      openingHours: "10:00〜22:00（年中無休）",
      bookingMethod: "ONLINE",
    },
  });

  await prisma.studioRoom.upsert({
    where: { id: "room-kashiwa-a" },
    update: {},
    create: {
      id: "room-kashiwa-a",
      studioId: studio.id,
      name: "Room A（バンド練習室）",
      capacityPersons: 6,
      sizeSqm: 20,
      hasDrums: true,
      drumSpec: "Yamaha DTX6K3-X（電子ドラム）",
      hasPA: true,
      paSpec: "Yamaha EMX5 + JBL EON615",
      hasAmps: true,
      hasMics: true,
      hourlyRateYen: 2000,
      hourlyRatePeak: 2500,
      minBookingHours: 1,
      notes: "最大6名まで。ドラムは電子ドラムのみ。",
    },
  });

  await prisma.studioRoom.upsert({
    where: { id: "room-kashiwa-b" },
    update: {},
    create: {
      id: "room-kashiwa-b",
      studioId: studio.id,
      name: "Room B（小編成向け）",
      capacityPersons: 3,
      sizeSqm: 12,
      hasDrums: false,
      hasPA: true,
      hasAmps: true,
      hasMics: true,
      hourlyRateYen: 1200,
      minBookingHours: 1,
      notes: "ドラム不可。アコースティック・デュオ・トリオ向け。",
    },
  });

  console.log("  ✓ 1 studio + 2 rooms seeded");

  // ─── ミュージシャンプロフィール ─────────────────────────────────────────────

  const musicianProfile1 = await prisma.musicianProfile.upsert({
    where: { userId: musician1.id },
    update: {},
    create: {
      userId: musician1.id,
      bio: "ジャズが大好きなギタリストです。スタンダード中心に演奏しています。",
      areaLabel: "柏エリア",
      areaLat: 35.8677,
      areaLng: 139.9750,
      travelRadiusKm: 15,
      skillLevel: SkillLevel.INTERMEDIATE,
      sessionGoal: SessionGoal.BOTH,
      feedbackPref: FeedbackPref.WELCOME,
      sessionStyle: SessionStyle.VARIETY,
      yearsPlaying: 5,
      snsLinks: {},
    },
  });

  await prisma.musicianInstrument.upsert({
    where: { id: "inst-tanaka-guitar" },
    update: {},
    create: {
      id: "inst-tanaka-guitar",
      musicianProfileId: musicianProfile1.id,
      instrument: "ギター",
      proficiency: "中級",
    },
  });

  await prisma.musicianGenre.createMany({
    data: [
      { musicianProfileId: musicianProfile1.id, genre: "ジャズ" },
      { musicianProfileId: musicianProfile1.id, genre: "ボサノバ" },
    ],
    skipDuplicates: true,
  });

  // v0.3: 対応エリア（複数）+ SYNCROOM
  await prisma.musicianCoverageArea.upsert({
    where: { id: "area-tanaka-home" },
    update: {},
    create: {
      id: "area-tanaka-home",
      musicianProfileId: musicianProfile1.id,
      areaLabel: "柏エリア",
      areaLat: 35.8677,
      areaLng: 139.9750,
      isHome: true,
      isPublic: true,
    },
  });

  await prisma.musicianCoverageArea.upsert({
    where: { id: "area-tanaka-akiba" },
    update: {},
    create: {
      id: "area-tanaka-akiba",
      musicianProfileId: musicianProfile1.id,
      areaLabel: "秋葉原・上野エリア",
      isHome: false,
      isPublic: true,
    },
  });

  await prisma.musicianCoverageArea.upsert({
    where: { id: "area-tanaka-syncroom" },
    update: {},
    create: {
      id: "area-tanaka-syncroom",
      musicianProfileId: musicianProfile1.id,
      areaLabel: "SYNCROOM",
      isHome: false,
      isSyncroom: true,
      syncroomNotes: "光回線（有線）接続。平日夜・土日昼対応可。",
      isPublic: true,
    },
  });

  // ウィッシュリスト
  await prisma.songWish.upsert({
    where: {
      musicianProfileId_songId: {
        musicianProfileId: musicianProfile1.id,
        songId: "song-autumn-leaves",
      },
    },
    update: {},
    create: {
      musicianProfileId: musicianProfile1.id,
      songId: "song-autumn-leaves",
      preferredInstrument: "ギター",
    },
  });

  await prisma.songWish.upsert({
    where: {
      musicianProfileId_songId: {
        musicianProfileId: musicianProfile1.id,
        songId: "song-so-what",
      },
    },
    update: {},
    create: {
      musicianProfileId: musicianProfile1.id,
      songId: "song-so-what",
      preferredInstrument: "ギター",
    },
  });

  const musicianProfile2 = await prisma.musicianProfile.upsert({
    where: { userId: musician2.id },
    update: {},
    create: {
      userId: musician2.id,
      bio: "初心者ベーシストです。楽しく演奏できればOK！",
      areaLabel: "柏エリア",
      areaLat: 35.8680,
      areaLng: 139.9755,
      travelRadiusKm: 10,
      skillLevel: SkillLevel.BEGINNER,
      sessionGoal: SessionGoal.FUN,
      feedbackPref: FeedbackPref.LIGHT,
      sessionStyle: SessionStyle.EITHER,
      yearsPlaying: 1,
      snsLinks: {},
    },
  });

  await prisma.musicianInstrument.upsert({
    where: { id: "inst-suzuki-bass" },
    update: {},
    create: {
      id: "inst-suzuki-bass",
      musicianProfileId: musicianProfile2.id,
      instrument: "ベース",
      proficiency: "初心者",
    },
  });

  // v0.3: 対応エリア（鈴木は柏のみ・SYNCROOMなし）
  await prisma.musicianCoverageArea.upsert({
    where: { id: "area-suzuki-home" },
    update: {},
    create: {
      id: "area-suzuki-home",
      musicianProfileId: musicianProfile2.id,
      areaLabel: "柏エリア",
      areaLat: 35.8680,
      areaLng: 139.9755,
      isHome: true,
      isPublic: false, // プライベート設定
    },
  });

  console.log("  ✓ 2 musician profiles + coverage areas seeded");

  // ─── テストセッション ───────────────────────────────────────────────────────

  const testSession = await prisma.jamSession.upsert({
    where: { id: "session-test-001" },
    update: {},
    create: {
      id: "session-test-001",
      venueId: venue.id,
      sessionAdminId: venueUser.id,
      title: "木曜夜のジャズセッション",
      startsAt: new Date("2026-03-06T19:00:00+09:00"),
      durationMinutes: 180,
      format: SessionFormat.OPEN,
      isSyncroom: false,
      moodFlags: ["fun_allowed", "beginner_welcome"],
      maxParticipants: 15,
      registrationRequired: false,
      description: "毎週木曜日に開催しているオープンジャズセッションです。初心者大歓迎！",
    },
  });

  // セッション曲
  await prisma.jamSessionSong.upsert({
    where: { id: "session-song-001" },
    update: {},
    create: {
      id: "session-song-001",
      jamSessionId: testSession.id,
      songId: "song-autumn-leaves",
      orderIndex: 1,
    },
  });

  await prisma.jamSessionSong.upsert({
    where: { id: "session-song-002" },
    update: {},
    create: {
      id: "session-song-002",
      jamSessionId: testSession.id,
      songId: "song-fly-me-to-the-moon",
      orderIndex: 2,
    },
  });

  // 楽器募集
  await prisma.jamSessionInstrumentNeed.upsert({
    where: { id: "need-001" },
    update: {},
    create: {
      id: "need-001",
      jamSessionId: testSession.id,
      instrument: "ドラム",
      countNeeded: 1,
    },
  });

  // プライバシー設定
  await prisma.jamSessionPrivacySettings.upsert({
    where: { jamSessionId: testSession.id },
    update: {},
    create: {
      jamSessionId: testSession.id,
      controlledById: venueUser.id,
      visSessionFact: true,
      visDatetime: false,
      visSessionName: true,
      visSongListVenue: false,
    },
  });

  await prisma.jamSessionAdminConsent.upsert({
    where: { jamSessionId: testSession.id },
    update: {},
    create: {
      jamSessionId: testSession.id,
      sessionAdminId: venueUser.id,
      visSongList: false,
    },
  });

  // 参加登録
  await prisma.jamSessionRegistration.upsert({
    where: {
      jamSessionId_musicianProfileId: {
        jamSessionId: testSession.id,
        musicianProfileId: musicianProfile1.id,
      },
    },
    update: {},
    create: {
      jamSessionId: testSession.id,
      musicianProfileId: musicianProfile1.id,
      status: "CONFIRMED",
    },
  });

  console.log("  ✓ 1 test session seeded");

  console.log("\n✅ Seeding complete!");
  console.log("\n📋 Test data summary:");
  console.log("  - Songs: 8 (jazz standards + rock + J-Pop)");
  console.log("  - Venue: カシワバー (unverified) + 2 session tendencies");
  console.log("  - Studio: 柏ミュージックスタジオ + 2 rooms");
  console.log("  - Musicians: ジャズギタリスト田中 (coverage: 柏・秋葉原・SYNCROOM), ベーシスト鈴木");
  console.log("  - Session: 木曜夜のジャズセッション (2026-03-06)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
