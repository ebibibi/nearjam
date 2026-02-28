/**
 * seed-songs.ts
 *
 * ジャズスタンダード・セッション定番曲を Song テーブルに投入するシードスクリプト。
 * 実行: npx tsx scripts/seed-songs.ts
 *
 * 既に存在するタイトル+アーティストの組み合わせはスキップする（冪等）。
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as Parameters<typeof PrismaClient>[0]);

// ─── 曲リスト定義 ───────────────────────────────────────────────────────────

interface SongSeed {
  title: string;
  artist?: string;
  genre?: string;
  typicalKey?: string;
  typicalBpmMin?: number;
  typicalBpmMax?: number;
  tags?: string[];
}

const SONGS: SongSeed[] = [
  // ─── Jazz Standards ─────────────────────────────────────────────────────

  // Blues / Bebop
  { title: "Autumn Leaves", artist: "Joseph Kosma", genre: "Jazz", typicalKey: "Gm", typicalBpmMin: 80, typicalBpmMax: 130, tags: ["standard", "ballad", "minor"] },
  { title: "All the Things You Are", artist: "Jerome Kern", genre: "Jazz", typicalKey: "Ab", typicalBpmMin: 100, typicalBpmMax: 160, tags: ["standard", "bebop"] },
  { title: "Summertime", artist: "George Gershwin", genre: "Jazz", typicalKey: "Am", typicalBpmMin: 60, typicalBpmMax: 100, tags: ["standard", "ballad", "blues"] },
  { title: "Fly Me to the Moon", artist: "Bart Howard", genre: "Jazz", typicalKey: "Am", typicalBpmMin: 120, typicalBpmMax: 180, tags: ["standard", "swing"] },
  { title: "Blue Bossa", artist: "Kenny Dorham", genre: "Jazz", typicalKey: "Cm", typicalBpmMin: 90, typicalBpmMax: 130, tags: ["bossa nova", "latin jazz", "beginner friendly"] },
  { title: "Misty", artist: "Erroll Garner", genre: "Jazz", typicalKey: "Eb", typicalBpmMin: 60, typicalBpmMax: 90, tags: ["ballad", "standard"] },
  { title: "Girl from Ipanema", artist: "Antônio Carlos Jobim", genre: "Jazz", typicalKey: "F", typicalBpmMin: 100, typicalBpmMax: 130, tags: ["bossa nova", "standard"] },
  { title: "Wave", artist: "Antônio Carlos Jobim", genre: "Jazz", typicalKey: "D", typicalBpmMin: 100, typicalBpmMax: 140, tags: ["bossa nova"] },
  { title: "Take the A Train", artist: "Billy Strayhorn", genre: "Jazz", typicalKey: "C", typicalBpmMin: 160, typicalBpmMax: 220, tags: ["swing", "standard", "Ellington"] },
  { title: "Caravan", artist: "Duke Ellington", genre: "Jazz", typicalKey: "Dm", typicalBpmMin: 130, typicalBpmMax: 200, tags: ["standard", "exotic", "Ellington"] },
  { title: "Tenor Madness", artist: "Sonny Rollins", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 140, typicalBpmMax: 200, tags: ["blues", "bebop", "up-tempo"] },
  { title: "Now's the Time", artist: "Charlie Parker", genre: "Jazz", typicalKey: "F", typicalBpmMin: 150, typicalBpmMax: 220, tags: ["bebop", "blues", "Parker"] },
  { title: "Bags' Groove", artist: "Milt Jackson", genre: "Jazz", typicalKey: "F", typicalBpmMin: 120, typicalBpmMax: 170, tags: ["blues", "hard bop"] },
  { title: "Straight, No Chaser", artist: "Thelonious Monk", genre: "Jazz", typicalKey: "F", typicalBpmMin: 160, typicalBpmMax: 230, tags: ["blues", "bebop", "Monk"] },
  { title: "Well You Needn't", artist: "Thelonious Monk", genre: "Jazz", typicalKey: "F", typicalBpmMin: 140, typicalBpmMax: 200, tags: ["Monk", "bebop"] },
  { title: "Round Midnight", artist: "Thelonious Monk", genre: "Jazz", typicalKey: "Eb", typicalBpmMin: 50, typicalBpmMax: 80, tags: ["ballad", "Monk", "standard"] },
  { title: "Anthropology", artist: "Charlie Parker", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 180, typicalBpmMax: 280, tags: ["bebop", "rhythm changes", "up-tempo"] },
  { title: "Cherokee (Ray Noble)", artist: "Ray Noble", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 200, typicalBpmMax: 300, tags: ["bebop", "up-tempo"] },
  { title: "Donna Lee", artist: "Charlie Parker", genre: "Jazz", typicalKey: "Ab", typicalBpmMin: 200, typicalBpmMax: 280, tags: ["bebop", "up-tempo"] },
  { title: "Confirmation", artist: "Charlie Parker", genre: "Jazz", typicalKey: "F", typicalBpmMin: 150, typicalBpmMax: 220, tags: ["bebop", "Parker"] },
  { title: "Solar", artist: "Miles Davis", genre: "Jazz", typicalKey: "Cm", typicalBpmMin: 100, typicalBpmMax: 160, tags: ["modal", "Davis"] },
  { title: "So What", artist: "Miles Davis", genre: "Jazz", typicalKey: "D Dorian", typicalBpmMin: 130, typicalBpmMax: 170, tags: ["modal", "Davis", "Kind of Blue"] },
  { title: "Freddie Freeloader", artist: "Miles Davis", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 120, typicalBpmMax: 160, tags: ["blues", "modal", "Kind of Blue"] },
  { title: "All Blues", artist: "Miles Davis", genre: "Jazz", typicalKey: "G", typicalBpmMin: 90, typicalBpmMax: 120, tags: ["blues", "modal", "Kind of Blue", "6/8"] },
  { title: "My Favorite Things", artist: "Richard Rodgers", genre: "Jazz", typicalKey: "Em", typicalBpmMin: 120, typicalBpmMax: 180, tags: ["Coltrane", "waltz", "standard"] },
  { title: "Impressions", artist: "John Coltrane", genre: "Jazz", typicalKey: "Dm", typicalBpmMin: 130, typicalBpmMax: 200, tags: ["modal", "Coltrane"] },
  { title: "A Love Supreme", artist: "John Coltrane", genre: "Jazz", typicalKey: "F", typicalBpmMin: 100, typicalBpmMax: 140, tags: ["Coltrane", "spiritual"] },
  { title: "Footprints", artist: "Wayne Shorter", genre: "Jazz", typicalKey: "Cm", typicalBpmMin: 80, typicalBpmMax: 120, tags: ["modal", "Shorter", "waltz"] },
  { title: "Nefertiti", artist: "Wayne Shorter", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 100, typicalBpmMax: 140, tags: ["Shorter", "Davis"] },
  { title: "Speak No Evil", artist: "Wayne Shorter", genre: "Jazz", typicalKey: "Dm", typicalBpmMin: 120, typicalBpmMax: 170, tags: ["Shorter", "hard bop"] },
  { title: "Maiden Voyage", artist: "Herbie Hancock", genre: "Jazz", typicalKey: "D", typicalBpmMin: 90, typicalBpmMax: 130, tags: ["Hancock", "modal", "beginner friendly"] },
  { title: "Cantaloupe Island", artist: "Herbie Hancock", genre: "Jazz", typicalKey: "F", typicalBpmMin: 120, typicalBpmMax: 160, tags: ["Hancock", "modal", "funk"] },
  { title: "Watermelon Man", artist: "Herbie Hancock", genre: "Jazz", typicalKey: "F", typicalBpmMin: 120, typicalBpmMax: 160, tags: ["Hancock", "funk"] },
  { title: "Stolen Moments", artist: "Oliver Nelson", genre: "Jazz", typicalKey: "Cm", typicalBpmMin: 70, typicalBpmMax: 110, tags: ["modal", "minor blues"] },
  { title: "Mr. P.C.", artist: "John Coltrane", genre: "Jazz", typicalKey: "Cm", typicalBpmMin: 150, typicalBpmMax: 240, tags: ["blues", "Coltrane", "minor blues"] },
  { title: "Billie's Bounce", artist: "Charlie Parker", genre: "Jazz", typicalKey: "F", typicalBpmMin: 140, typicalBpmMax: 200, tags: ["blues", "bebop", "Parker"] },
  { title: "Blues in the Closet", artist: "Oscar Pettiford", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 130, typicalBpmMax: 190, tags: ["blues", "swing"] },
  { title: "Softly as in a Morning Sunrise", artist: "Sigmund Romberg", genre: "Jazz", typicalKey: "Cm", typicalBpmMin: 100, typicalBpmMax: 180, tags: ["standard", "minor"] },
  { title: "There Will Never Be Another You", artist: "Harry Warren", genre: "Jazz", typicalKey: "Eb", typicalBpmMin: 120, typicalBpmMax: 200, tags: ["standard", "swing"] },
  { title: "The Days of Wine and Roses", artist: "Henry Mancini", genre: "Jazz", typicalKey: "F", typicalBpmMin: 80, typicalBpmMax: 130, tags: ["standard", "ballad"] },
  { title: "Stella by Starlight", artist: "Victor Young", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 80, typicalBpmMax: 160, tags: ["standard", "ballad"] },
  { title: "Beautiful Love", artist: "Victor Young", genre: "Jazz", typicalKey: "Dm", typicalBpmMin: 100, typicalBpmMax: 160, tags: ["standard"] },
  { title: "I Got Rhythm", artist: "George Gershwin", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 160, typicalBpmMax: 260, tags: ["rhythm changes", "swing", "bebop"] },
  { title: "On Green Dolphin Street", artist: "Bronisław Kaper", genre: "Jazz", typicalKey: "Eb", typicalBpmMin: 120, typicalBpmMax: 200, tags: ["standard"] },
  { title: "Oleo", artist: "Sonny Rollins", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 180, typicalBpmMax: 260, tags: ["rhythm changes", "bebop", "Rollins"] },
  { title: "St. Thomas", artist: "Sonny Rollins", genre: "Jazz", typicalKey: "C", typicalBpmMin: 150, typicalBpmMax: 200, tags: ["calypso", "Rollins"] },
  { title: "Night and Day", artist: "Cole Porter", genre: "Jazz", typicalKey: "Eb", typicalBpmMin: 100, typicalBpmMax: 160, tags: ["Porter", "standard"] },
  { title: "What Is This Thing Called Love", artist: "Cole Porter", genre: "Jazz", typicalKey: "C", typicalBpmMin: 140, typicalBpmMax: 220, tags: ["Porter", "standard", "rhythm"] },
  { title: "Autumn in New York", artist: "Vernon Duke", genre: "Jazz", typicalKey: "F", typicalBpmMin: 60, typicalBpmMax: 100, tags: ["standard", "ballad"] },
  { title: "The Shadow of Your Smile", artist: "Johnny Mandel", genre: "Jazz", typicalKey: "F", typicalBpmMin: 70, typicalBpmMax: 110, tags: ["standard", "ballad"] },
  { title: "Someday My Prince Will Come", artist: "Larry Morey", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 100, typicalBpmMax: 150, tags: ["standard", "waltz", "Miles Davis"] },
  { title: "You Don't Know What Love Is", artist: "Gene De Paul", genre: "Jazz", typicalKey: "F", typicalBpmMin: 50, typicalBpmMax: 80, tags: ["ballad", "standard"] },
  { title: "My Romance", artist: "Richard Rodgers", genre: "Jazz", typicalKey: "C", typicalBpmMin: 70, typicalBpmMax: 120, tags: ["standard", "ballad"] },
  { title: "Have You Met Miss Jones", artist: "Richard Rodgers", genre: "Jazz", typicalKey: "F", typicalBpmMin: 120, typicalBpmMax: 200, tags: ["standard", "swing"] },
  { title: "How High the Moon", artist: "Morgan Lewis", genre: "Jazz", typicalKey: "G", typicalBpmMin: 160, typicalBpmMax: 260, tags: ["standard", "rhythm", "bebop"] },
  { title: "Body and Soul", artist: "Johnny Green", genre: "Jazz", typicalKey: "Db", typicalBpmMin: 60, typicalBpmMax: 100, tags: ["standard", "ballad", "Coltrane"] },
  { title: "In a Sentimental Mood", artist: "Duke Ellington", genre: "Jazz", typicalKey: "Dm", typicalBpmMin: 60, typicalBpmMax: 90, tags: ["ballad", "Ellington"] },
  { title: "Black Orpheus (Manha de Carnaval)", artist: "Luiz Bonfá", genre: "Jazz", typicalKey: "Am", typicalBpmMin: 80, typicalBpmMax: 120, tags: ["bossa nova", "latin"] },
  { title: "Desafinado", artist: "Antônio Carlos Jobim", genre: "Jazz", typicalKey: "F", typicalBpmMin: 100, typicalBpmMax: 140, tags: ["bossa nova", "Jobim"] },
  { title: "Corcovado (Quiet Nights)", artist: "Antônio Carlos Jobim", genre: "Jazz", typicalKey: "C", typicalBpmMin: 70, typicalBpmMax: 100, tags: ["bossa nova", "Jobim", "ballad"] },
  { title: "Bluebird", artist: "Billy Strayhorn", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 120, typicalBpmMax: 180, tags: ["swing", "Ellington"] },
  { title: "Satin Doll", artist: "Duke Ellington", genre: "Jazz", typicalKey: "C", typicalBpmMin: 120, typicalBpmMax: 180, tags: ["swing", "Ellington", "standard"] },
  { title: "Lullaby of Birdland", artist: "George Shearing", genre: "Jazz", typicalKey: "Em", typicalBpmMin: 140, typicalBpmMax: 200, tags: ["standard", "swing"] },
  { title: "Joy Spring", artist: "Clifford Brown", genre: "Jazz", typicalKey: "F", typicalBpmMin: 180, typicalBpmMax: 260, tags: ["bebop", "Brown"] },
  { title: "Daahoud", artist: "Clifford Brown", genre: "Jazz", typicalKey: "Eb", typicalBpmMin: 180, typicalBpmMax: 260, tags: ["hard bop", "Brown"] },
  { title: "Dig", artist: "Miles Davis", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 180, typicalBpmMax: 260, tags: ["bebop", "rhythm changes"] },
  { title: "Woody'n You", artist: "Dizzy Gillespie", genre: "Jazz", typicalKey: "Ab", typicalBpmMin: 150, typicalBpmMax: 230, tags: ["bebop", "Gillespie"] },
  { title: "A Night in Tunisia", artist: "Dizzy Gillespie", genre: "Jazz", typicalKey: "Dm", typicalBpmMin: 140, typicalBpmMax: 220, tags: ["bebop", "Gillespie", "exotic"] },
  { title: "Bernie's Tune", artist: "Bernie Miller", genre: "Jazz", typicalKey: "Dm", typicalBpmMin: 150, typicalBpmMax: 220, tags: ["blues", "swing"] },
  { title: "Four", artist: "Miles Davis", genre: "Jazz", typicalKey: "Eb", typicalBpmMin: 170, typicalBpmMax: 240, tags: ["bebop", "Davis"] },
  { title: "Whisper Not", artist: "Benny Golson", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 120, typicalBpmMax: 170, tags: ["hard bop", "Golson"] },
  { title: "Killer Joe", artist: "Benny Golson", genre: "Jazz", typicalKey: "F", typicalBpmMin: 100, typicalBpmMax: 140, tags: ["hard bop", "Golson", "beginner friendly"] },
  { title: "Along Came Betty", artist: "Benny Golson", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 150, typicalBpmMax: 220, tags: ["hard bop", "Golson"] },
  { title: "Moanin'", artist: "Bobby Timmons", genre: "Jazz", typicalKey: "Fm", typicalBpmMin: 120, typicalBpmMax: 180, tags: ["hard bop", "gospel", "Blues"] },
  { title: "Dat Dere", artist: "Bobby Timmons", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 100, typicalBpmMax: 140, tags: ["hard bop", "gospel"] },
  { title: "Ceora", artist: "Lee Morgan", genre: "Jazz", typicalKey: "Ab", typicalBpmMin: 100, typicalBpmMax: 150, tags: ["hard bop", "Morgan"] },
  { title: "The Sidewinder", artist: "Lee Morgan", genre: "Jazz", typicalKey: "Cm", typicalBpmMin: 130, typicalBpmMax: 180, tags: ["hard bop", "Morgan", "funk"] },
  { title: "Infant Eyes", artist: "Wayne Shorter", genre: "Jazz", typicalKey: "Eb", typicalBpmMin: 50, typicalBpmMax: 70, tags: ["ballad", "Shorter"] },
  { title: "ESP", artist: "Wayne Shorter", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 130, typicalBpmMax: 190, tags: ["Shorter", "Davis"] },
  { title: "Fee Fi Fo Fum", artist: "Wayne Shorter", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 130, typicalBpmMax: 190, tags: ["Shorter", "hard bop"] },
  { title: "Witch Hunt", artist: "Wayne Shorter", genre: "Jazz", typicalKey: "Cm", typicalBpmMin: 100, typicalBpmMax: 150, tags: ["Shorter", "modal"] },
  { title: "One for Daddy-O", artist: "Nat Adderley", genre: "Jazz", typicalKey: "F", typicalBpmMin: 130, typicalBpmMax: 180, tags: ["blues", "hard bop"] },
  { title: "Work Song", artist: "Nat Adderley", genre: "Jazz", typicalKey: "Fm", typicalBpmMin: 130, typicalBpmMax: 180, tags: ["blues", "hard bop", "gospel"] },
  { title: "Mercy Mercy Mercy", artist: "Joe Zawinul", genre: "Jazz", typicalKey: "Eb", typicalBpmMin: 80, typicalBpmMax: 120, tags: ["soul jazz", "funk"] },
  { title: "Pork Pie Hat", artist: "Charles Mingus", genre: "Jazz", typicalKey: "F", typicalBpmMin: 50, typicalBpmMax: 80, tags: ["ballad", "Mingus"] },
  { title: "Goodbye Pork Pie Hat", artist: "Charles Mingus", genre: "Jazz", typicalKey: "F", typicalBpmMin: 50, typicalBpmMax: 80, tags: ["ballad", "Mingus"] },
  { title: "Jelly Roll", artist: "Charles Mingus", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 120, typicalBpmMax: 180, tags: ["Mingus", "swing"] },
  { title: "Epistrophy", artist: "Thelonious Monk", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 130, typicalBpmMax: 200, tags: ["Monk", "bebop"] },
  { title: "Blue Monk", artist: "Thelonious Monk", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 110, typicalBpmMax: 160, tags: ["Monk", "blues", "beginner friendly"] },
  { title: "Bemsha Swing", artist: "Thelonious Monk", genre: "Jazz", typicalKey: "Db", typicalBpmMin: 140, typicalBpmMax: 200, tags: ["Monk", "swing"] },
  { title: "I Mean You", artist: "Thelonious Monk", genre: "Jazz", typicalKey: "F", typicalBpmMin: 150, typicalBpmMax: 220, tags: ["Monk", "bebop"] },
  { title: "In Walked Bud", artist: "Thelonious Monk", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 150, typicalBpmMax: 220, tags: ["Monk", "bebop"] },
  { title: "Monk's Dream", artist: "Thelonious Monk", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 140, typicalBpmMax: 200, tags: ["Monk", "bebop"] },

  // ─── Blues ─────────────────────────────────────────────────────────────
  { title: "Route 66", artist: "Bobby Troup", genre: "Blues", typicalKey: "Bb", typicalBpmMin: 130, typicalBpmMax: 180, tags: ["shuffle", "blues", "rock"] },
  { title: "Kansas City", artist: "Jerry Leiber / Mike Stoller", genre: "Blues", typicalKey: "C", typicalBpmMin: 140, typicalBpmMax: 190, tags: ["shuffle", "R&B"] },
  { title: "Stormy Monday", artist: "T-Bone Walker", genre: "Blues", typicalKey: "G", typicalBpmMin: 50, typicalBpmMax: 80, tags: ["slow blues", "Texas"] },
  { title: "Red House", artist: "Jimi Hendrix", genre: "Blues", typicalKey: "Bb", typicalBpmMin: 50, typicalBpmMax: 80, tags: ["slow blues", "Hendrix"] },
  { title: "Sweet Home Chicago", artist: "Robert Johnson", genre: "Blues", typicalKey: "E", typicalBpmMin: 120, typicalBpmMax: 180, tags: ["Chicago blues", "shuffle"] },
  { title: "The Thrill Is Gone", artist: "Roy Hawkins", genre: "Blues", typicalKey: "Bm", typicalBpmMin: 60, typicalBpmMax: 90, tags: ["minor blues", "B.B. King"] },
  { title: "Pride and Joy", artist: "Stevie Ray Vaughan", genre: "Blues", typicalKey: "E", typicalBpmMin: 130, typicalBpmMax: 180, tags: ["Texas blues", "SRV"] },
  { title: "Crossroads", artist: "Robert Johnson", genre: "Blues", typicalKey: "A", typicalBpmMin: 150, typicalBpmMax: 210, tags: ["blues rock", "Cream"] },

  // ─── Funk / Soul ────────────────────────────────────────────────────────
  { title: "September", artist: "Earth, Wind & Fire", genre: "Funk", typicalKey: "D", typicalBpmMin: 120, typicalBpmMax: 140, tags: ["funk", "soul", "beginner friendly"] },
  { title: "Sir Duke", artist: "Stevie Wonder", genre: "Funk", typicalKey: "B", typicalBpmMin: 120, typicalBpmMax: 140, tags: ["funk", "soul", "Wonder"] },
  { title: "Superstition", artist: "Stevie Wonder", genre: "Funk", typicalKey: "Eb", typicalBpmMin: 95, typicalBpmMax: 115, tags: ["funk", "soul", "Wonder"] },
  { title: "I Wish", artist: "Stevie Wonder", genre: "Funk", typicalKey: "Eb", typicalBpmMin: 95, typicalBpmMax: 115, tags: ["funk", "soul", "Wonder"] },
  { title: "Give Up the Funk", artist: "Parliament", genre: "Funk", typicalKey: "G", typicalBpmMin: 100, typicalBpmMax: 120, tags: ["funk", "Parliament-Funkadelic"] },
  { title: "Papa's Got a Brand New Bag", artist: "James Brown", genre: "Funk", typicalKey: "E", typicalBpmMin: 120, typicalBpmMax: 150, tags: ["funk", "R&B", "James Brown"] },
  { title: "Sex Machine", artist: "James Brown", genre: "Funk", typicalKey: "D", typicalBpmMin: 110, typicalBpmMax: 130, tags: ["funk", "James Brown"] },
  { title: "Shining Star", artist: "Earth, Wind & Fire", genre: "Funk", typicalKey: "E", typicalBpmMin: 105, typicalBpmMax: 115, tags: ["funk", "R&B"] },
  { title: "Got to Give It Up", artist: "Marvin Gaye", genre: "Funk", typicalKey: "A", typicalBpmMin: 110, typicalBpmMax: 130, tags: ["funk", "soul", "Gaye"] },

  // ─── Latin / Bossa Nova ─────────────────────────────────────────────────
  { title: "So Danco Samba", artist: "Antônio Carlos Jobim", genre: "Jazz", typicalKey: "G", typicalBpmMin: 130, typicalBpmMax: 180, tags: ["bossa nova", "Jobim"] },
  { title: "Agua de Beber", artist: "Antônio Carlos Jobim", genre: "Jazz", typicalKey: "D", typicalBpmMin: 120, typicalBpmMax: 160, tags: ["bossa nova", "Jobim"] },
  { title: "Triste", artist: "Antônio Carlos Jobim", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 120, typicalBpmMax: 160, tags: ["bossa nova", "Jobim"] },
  { title: "Mas Que Nada", artist: "Jorge Ben", genre: "Jazz", typicalKey: "Am", typicalBpmMin: 130, typicalBpmMax: 170, tags: ["bossa nova", "samba"] },
  { title: "Afro Blue", artist: "Mongo Santamaría", genre: "Jazz", typicalKey: "Cm", typicalBpmMin: 100, typicalBpmMax: 140, tags: ["latin", "Coltrane", "3/4"] },
  { title: "España", artist: "Chick Corea", genre: "Jazz", typicalKey: "Am", typicalBpmMin: 130, typicalBpmMax: 180, tags: ["latin jazz", "Corea", "flamenco"] },

  // ─── Rock / Pop classics popular at jam sessions ─────────────────────
  { title: "Johnny B. Goode", artist: "Chuck Berry", genre: "Rock", typicalKey: "Bb", typicalBpmMin: 160, typicalBpmMax: 200, tags: ["rock", "blues rock", "beginner friendly"] },
  { title: "Sunshine of Your Love", artist: "Cream", genre: "Rock", typicalKey: "D", typicalBpmMin: 80, typicalBpmMax: 110, tags: ["rock", "blues rock", "riff"] },
  { title: "While My Guitar Gently Weeps", artist: "The Beatles", genre: "Rock", typicalKey: "Am", typicalBpmMin: 60, typicalBpmMax: 90, tags: ["rock", "Beatles", "ballad"] },
  { title: "Blackbird", artist: "The Beatles", genre: "Rock", typicalKey: "G", typicalBpmMin: 70, typicalBpmMax: 100, tags: ["Beatles", "acoustic", "fingerpicking"] },
  { title: "Hotel California", artist: "Eagles", genre: "Rock", typicalKey: "Bm", typicalBpmMin: 70, typicalBpmMax: 90, tags: ["rock", "Eagles", "guitar"] },
  { title: "Comfortably Numb", artist: "Pink Floyd", genre: "Rock", typicalKey: "Dm", typicalBpmMin: 60, typicalBpmMax: 80, tags: ["rock", "Pink Floyd", "guitar solo"] },
  { title: "More Than a Feeling", artist: "Boston", genre: "Rock", typicalKey: "D", typicalBpmMin: 110, typicalBpmMax: 130, tags: ["rock", "Boston"] },
  { title: "Bohemian Rhapsody", artist: "Queen", genre: "Rock", typicalKey: "Bb", typicalBpmMin: 70, typicalBpmMax: 120, tags: ["rock", "Queen", "opera"] },
  { title: "Purple Rain", artist: "Prince", genre: "Rock", typicalKey: "Bb", typicalBpmMin: 60, typicalBpmMax: 80, tags: ["rock", "Prince", "ballad", "R&B"] },

  // ─── J-Pop / Anison popular at Japanese jam sessions ────────────────────
  { title: "Kesara", artist: "Pata Pata", genre: "Pop", typicalKey: "Gm", typicalBpmMin: 90, typicalBpmMax: 110, tags: ["J-Pop", "session staple", "Japan"] },
  { title: "Yoru ni Kakeru", artist: "YOASOBI", genre: "Pop", typicalKey: "Em", typicalBpmMin: 120, typicalBpmMax: 140, tags: ["J-Pop", "anime", "popular"] },
  { title: "Odo", artist: "Aimyon", genre: "Pop", typicalKey: "G", typicalBpmMin: 130, typicalBpmMax: 150, tags: ["J-Pop", "Japan"] },
  { title: "Gurenge", artist: "LiSA", genre: "Pop", typicalKey: "Dm", typicalBpmMin: 140, typicalBpmMax: 165, tags: ["anime", "Demon Slayer", "popular"] },
  { title: "Pretender", artist: "Official HIGE DANdism", genre: "Pop", typicalKey: "Ab", typicalBpmMin: 80, typicalBpmMax: 100, tags: ["J-Pop", "ballad", "popular"] },
  { title: "Subtitle", artist: "Official HIGE DANdism", genre: "Pop", typicalKey: "Eb", typicalBpmMin: 90, typicalBpmMax: 110, tags: ["J-Pop", "popular"] },
  { title: "First Love", artist: "Utada Hikaru", genre: "Pop", typicalKey: "Db", typicalBpmMin: 60, typicalBpmMax: 80, tags: ["J-Pop", "ballad", "popular"] },
  { title: "Automatic", artist: "Utada Hikaru", genre: "Pop", typicalKey: "F", typicalBpmMin: 90, typicalBpmMax: 110, tags: ["J-Pop", "R&B"] },
  { title: "Niji", artist: "Fujii Kaze", genre: "Pop", typicalKey: "G", typicalBpmMin: 80, typicalBpmMax: 100, tags: ["J-Pop", "ballad", "popular"] },
  { title: "Kirari", artist: "Fujii Kaze", genre: "Pop", typicalKey: "F", typicalBpmMin: 110, typicalBpmMax: 130, tags: ["J-Pop", "popular"] },
  { title: "Shunrai", artist: "Yama", genre: "Pop", typicalKey: "Eb", typicalBpmMin: 80, typicalBpmMax: 100, tags: ["J-Pop", "ballad"] },
  { title: "Cheer Up!", artist: "Twice", genre: "Pop", typicalKey: "G", typicalBpmMin: 140, typicalBpmMax: 160, tags: ["K-Pop", "idol"] },
  { title: "Sekai ni Hitotsu dake no Hana", artist: "SMAP", genre: "Pop", typicalKey: "Bb", typicalBpmMin: 90, typicalBpmMax: 110, tags: ["J-Pop", "classic", "Japan"] },
  { title: "Hana wa Saku", artist: "Various", genre: "Pop", typicalKey: "Bb", typicalBpmMin: 80, typicalBpmMax: 100, tags: ["J-Pop", "classic"] },
  { title: "Tsunami", artist: "Southern All Stars", genre: "Pop", typicalKey: "D", typicalBpmMin: 100, typicalBpmMax: 120, tags: ["J-Pop", "classic", "Japan"] },
  { title: "True Colors", artist: "Cyndi Lauper", genre: "Pop", typicalKey: "Eb", typicalBpmMin: 70, typicalBpmMax: 90, tags: ["pop", "ballad", "80s"] },
  { title: "Stand By Me", artist: "Ben E. King", genre: "Pop", typicalKey: "A", typicalBpmMin: 90, typicalBpmMax: 110, tags: ["pop", "classic", "R&B"] },
  { title: "What's Going On", artist: "Marvin Gaye", genre: "Pop", typicalKey: "Eb", typicalBpmMin: 90, typicalBpmMax: 110, tags: ["soul", "R&B", "Gaye"] },
  { title: "Isn't She Lovely", artist: "Stevie Wonder", genre: "Pop", typicalKey: "E", typicalBpmMin: 100, typicalBpmMax: 130, tags: ["pop", "soul", "Wonder"] },
  { title: "Overjoyed", artist: "Stevie Wonder", genre: "Pop", typicalKey: "Eb", typicalBpmMin: 70, typicalBpmMax: 90, tags: ["pop", "ballad", "Wonder"] },
  { title: "Don't Know Why", artist: "Norah Jones", genre: "Jazz", typicalKey: "Bb", typicalBpmMin: 80, typicalBpmMax: 100, tags: ["jazz pop", "ballad", "Jones"] },
  { title: "Come Away with Me", artist: "Norah Jones", genre: "Jazz", typicalKey: "C", typicalBpmMin: 70, typicalBpmMax: 90, tags: ["jazz pop", "ballad", "Jones"] },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🎵 Seeding ${SONGS.length} songs to the database...\n`);

  let created = 0;
  let skipped = 0;

  for (const song of SONGS) {
    const existing = await prisma.song.findFirst({
      where: { title: song.title, artist: song.artist ?? null },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.song.create({
      data: {
        title: song.title,
        artist: song.artist,
        genre: song.genre,
        typicalKey: song.typicalKey,
        typicalBpmMin: song.typicalBpmMin,
        typicalBpmMax: song.typicalBpmMax,
        tags: song.tags ?? [],
        approved: true,
        wishlistCount: 0,
      },
    });
    created++;

    if (created % 20 === 0) {
      process.stdout.write(`  ✅ ${created} songs created...\r`);
    }
  }

  console.log(`\n✅ Done! Created: ${created}, Skipped (already exists): ${skipped}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
