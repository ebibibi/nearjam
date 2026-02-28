import { z } from 'zod';

// LLMが1ページから抽出する結果の型
// Prismaスキーマに対応させているが、DB保存前に人間レビューが入る

export const ExtractedVenueSchema = z.object({
  name: z.string().describe('店名・会場名'),
  address: z.string().optional().describe('住所（都道府県から）'),
  nearestStation: z.string().optional().describe('最寄り駅名'),
  walkMinutes: z.number().int().optional().describe('最寄り駅からの徒歩分数'),
  websiteUrl: z.string().url().optional().describe('公式ウェブサイトURL'),
  instagramUrl: z.string().url().optional().describe('Instagram URL'),
  xUrl: z.string().url().optional().describe('X（旧Twitter）URL'),
  facebookUrl: z.string().url().optional().describe('Facebook URL'),
  bookingUrl: z.string().url().optional().describe('予約・問い合わせURL'),
  bookingPhone: z.string().optional().describe('電話番号'),
});

export const ExtractedSessionTendencySchema = z.object({
  name: z.string().optional().describe('セッション名（例: 毎週水曜ジャズセッション）'),
  typicalDayOfWeek: z.number().int().min(0).max(6).optional()
    .describe('曜日（0=日 1=月 2=火 3=水 4=木 5=金 6=土）'),
  typicalStartTime: z.string().optional().describe('開始時刻 HH:MM 形式'),
  typicalEndTime: z.string().optional().describe('終了時刻 HH:MM 形式'),
  genres: z.array(z.string()).optional().describe('ジャンル（例: Jazz, Blues, Rock）'),
  atmosphere: z.string().optional().describe('雰囲気・特徴の説明文'),
  levelRange: z.string().optional().describe('参加レベル（例: 初心者歓迎, 中級以上）'),
  entrySystem: z.string().optional().describe('入場方法・料金（例: 無料, 500円, ワンドリンク制）'),
  capacity: z.number().int().optional().describe('定員人数'),
});

// 1ページから抽出した全情報
export const ExtractionResultSchema = z.object({
  venue: ExtractedVenueSchema.optional()
    .describe('会場情報（ページが会場のものであれば）'),
  sessions: z.array(ExtractedSessionTendencySchema).optional()
    .describe('定期セッション情報のリスト'),
  confidence: z.number().min(0).max(1)
    .describe('情報の信頼度（0.0〜1.0）'),
  notes: z.string().optional()
    .describe('抽出時の備考・不確かな点'),
});

export type ExtractedVenue = z.infer<typeof ExtractedVenueSchema>;
export type ExtractedSessionTendency = z.infer<typeof ExtractedSessionTendencySchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
