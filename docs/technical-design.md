# NearJam — Technical Design Document

**Version**: 0.3（2026-02-27）
**Status**: Draft
**Corresponding PRD**: v0.3

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  Browser / PWA                               │
│              Next.js (App Router, SSR)                       │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│         Azure Static Web Apps (Free plan)                    │
│      Next.js Frontend + API Routes (Edge/Node)               │
└──────┬────────────────────┬───────────────────┬─────────────┘
       │                    │                   │
       │ Auth (NextAuth.js)  │ DB (Prisma ORM)   │ Bot / Cron
       │                    │                   │
┌──────▼──────┐   ┌─────────▼──────────┐  ┌────▼───────────────┐
│  NextAuth   │   │ Azure DB for        │  │ Collection Bot      │
│  (JWT/DB    │   │ PostgreSQL 16       │  │ (Azure Functions    │
│   session)  │   │ Flexible B1ms       │  │  Timer Trigger)     │
└─────────────┘   └────────────────────┘  └────────────────────┘
                            │
              ┌─────────────┼──────────────┐
              │             │              │
    ┌─────────▼────┐ ┌──────▼──────┐ ┌────▼────────────┐
    │ Claude API   │ │ Google Maps │ │ SNS / HP Fetch  │
    │ (AI suggest) │ │ Platform API│ │ (Bot targets)   │
    └──────────────┘ └─────────────┘ └─────────────────┘
```

### Design Principles

1. **Maximum portability** — No Azure-specific services at the application layer. PostgreSQL + Next.js + NextAuth.js run anywhere. Migration candidates: Vercel + Railway / Supabase.
2. **Scale-to-zero** — Azure Static Web Apps + API Routes have no idle cost.
3. **Standard PostgreSQL** — No Cosmos DB, Azure SQL-specific features, or proprietary extensions. Prisma ORM with standard SQL only.
4. **Geocoding cached** — Google Maps API calls are rate-limited and billed. All geocode results stored in DB, refreshed only when address changes.

---

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 16 (App Router) + TypeScript | SSR/SSG, API Routes, portability |
| Styling | Tailwind CSS | Utility-first, zero runtime overhead |
| ORM | Prisma v7 | Type-safe DB access, migration management |
| Auth | NextAuth.js v5 | Google OAuth + magic link, no vendor lock-in |
| Database | PostgreSQL 16 | Standard SQL, hosted on Azure DB for PostgreSQL Flexible |
| Maps | Google Maps Platform (JS API + Geocoding API) | Venue/studio map display and routing |
| AI | Anthropic Claude API | Session combination suggestions, digest generation |
| Bot | Azure Functions (Timer Trigger) | Periodic venue SNS/HP collection |
| Hosting | Azure Static Web Apps | Free frontend hosting + Azure Functions runtime for APIs |
| CI/CD | GitHub Actions | Auto-deploy on push to `main` |
| Local dev | Docker Compose | PostgreSQL + app in container |

---

## 3. Database Schema

### 3.1 Key Design Decisions

**AND-consent model implementation**:
Performance log visibility is controlled independently by multiple parties. The AND-join rule ("only publish when everyone has consented") is expressed via boolean columns per party.

```
# Whether "Person A played [song]" is visible:
vis_musician = true
AND vis_venue = true
AND vis_session_admin = true
→ public

# If ANY is false → private. Instant effect.
```

**Venue/Studio state management**:
`verified_at` / `disputed_at` as nullable timestamps for state.

| State | Condition |
|-------|-----------|
| Unverified | `verified_at IS NULL` |
| Verified | `verified_at IS NOT NULL AND disputed_at IS NULL` |
| Disputed | `disputed_at IS NOT NULL` |

**Place entity split (v0.3 new)**:
`VenueProfile` from v0.2 is split into `Venue` and `Studio`. Both share a `Place` base concept but have different sub-entities.

**SessionTendency vs JamSession**:
- `SessionTendency`: recurring pattern (e.g., "Every Thursday, jazz session") — crowdsourced/auto-collected
- `JamSession`: a specific dated session event — created by users for registration and on-day tools

**Geocoding cache**:
Google Maps Geocoding API is called when address is first set or changes. Results (`lat`, `lng`) are stored in DB. Never call Geocoding API per-request.

---

### 3.2 Entity List

| Entity | Description |
|--------|-------------|
| `User` | Auth user (NextAuth base) |
| `Account` | OAuth provider link (NextAuth) |
| `Session` | Auth session (NextAuth) |
| `VerificationToken` | Magic link token (NextAuth) |
| `MusicianProfile` | Musician preferences and profile |
| `MusicianInstrument` | Instruments a musician plays |
| `MusicianGenre` | Genres a musician plays |
| `MusicianCoverageArea` | Additional areas beyond home base + SYNCROOM availability |
| `Venue` | Jam session venue (bar, live house, etc.) |
| `SessionTendency` | Recurring session pattern at a venue (multiple per venue) |
| `Studio` | Rehearsal studio |
| `StudioRoom` | Individual room within a studio |
| `Song` | Song database entry |
| `SongWish` | Musician's wishlist entry (private by default) |
| `JamSession` | A specific dated session event |
| `JamSessionSong` | Song planned for a specific session |
| `JamSessionInstrumentNeed` | Instruments needed at a session |
| `JamSessionRegistration` | Registration of a musician for a session |
| `JamSessionPrivacySettings` | Visibility settings for a session |
| `JamSessionAdminConsent` | Session admin's consent for log publishing |
| `PerformanceLog` | Who played what at a session |
| `Kudos` | Post-session kudos from one user to another |
| `AnonymousFeedback` | Anonymous feedback to venue/session admin |
| `Connection` | Mutual-approval connection between musicians |
| `Block` | Block relationship between users |
| `Notification` | In-app notifications |
| `AutoCollectionJob` | State tracker for bot collection jobs |
| `VenuePost` | Crowdsourced info entry (either crowdsourced or auto-collected) |

---

### 3.3 Schema Definition (Prisma)

> Note: NextAuth.js requires `Session` model. NearJam jam sessions use `JamSession` to avoid collision.

```prisma
// ─────────────────────────────────────
// NextAuth.js models (required)
// ─────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  role          UserRole  @default(MUSICIAN)
  nickname      String?
  bio           String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts          Account[]
  sessions          Session[]
  musicianProfile   MusicianProfile?
  venueProfiles     Venue[]            @relation("VenueOwner")
  studioProfiles    Studio[]           @relation("StudioOwner")
  jamSessionsAdmin  JamSession[]       @relation("SessionAdmin")
  registrations     JamSessionRegistration[]
  performanceLogs   PerformanceLog[]
  kudosSent         Kudos[]            @relation("KudosSender")
  kudosReceived     Kudos[]            @relation("KudosReceiver")
  connectionsA      Connection[]       @relation("ConnectionA")
  connectionsB      Connection[]       @relation("ConnectionB")
  blocksGiven       Block[]            @relation("Blocker")
  blocksReceived    Block[]            @relation("Blocked")
  notifications     Notification[]
  venuePosts        VenuePost[]        @relation("PostAuthor")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

// ─────────────────────────────────────
// Musician
// ─────────────────────────────────────

model MusicianProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  homeArea        String?
  travelRange     Int?     // km: 5 / 15 / 30 / null=unlimited
  skillLevel      SkillLevel @default(BEGINNER)
  levelPref       LevelPref  @default(ANY)
  sessionGoal     SessionGoal @default(BOTH)
  playVolumePref  PlayVolumePref @default(EITHER)
  challengePref   ChallengePref @default(EITHER)
  feedbackPref    FeedbackPref @default(LIGHT)
  sessionStyle    SessionStyle @default(EITHER)
  tempoPref       TempoPref @default(MODERATE)
  profileVis      ProfileVisibility @default(LOGGED_IN)
  historyVis      ProfileVisibility @default(PRIVATE)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User @relation(fields: [userId], references: [id], onDelete: Cascade)
  instruments     MusicianInstrument[]
  genres          MusicianGenre[]
  coverageAreas   MusicianCoverageArea[]
  songWishes      SongWish[]
}

model MusicianInstrument {
  id        String @id @default(cuid())
  profileId String
  instrument String
  isPrimary  Boolean @default(false)
  profile   MusicianProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
}

model MusicianGenre {
  id        String @id @default(cuid())
  profileId String
  genre     String
  profile   MusicianProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
}

// New in v0.3: coverage areas + SYNCROOM
model MusicianCoverageArea {
  id              String  @id @default(cuid())
  profileId       String
  areaName        String  // e.g., "Kashiwa", "Akihabara"
  isHome          Boolean @default(false)
  isSyncroom      Boolean @default(false)  // true = this is the SYNCROOM availability entry
  syncroomNotes   String? // room name, connection notes
  isPublic        Boolean @default(false)  // visibility
  profile         MusicianProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)
}

// ─────────────────────────────────────
// Venue (jam session bars, live houses)
// ─────────────────────────────────────

model Venue {
  id               String   @id @default(cuid())
  name             String
  address          String?
  nearestStation   String?
  walkingMinutes   Int?
  lat              Float?   // cached from Geocoding API
  lng              Float?   // cached from Geocoding API
  websiteUrl       String?
  instagramUrl     String?
  xUrl             String?
  facebookUrl      String?
  bookingUrl       String?
  phone            String?
  ownerId          String?  // null = no verified owner yet
  verifiedAt       DateTime?
  verifiedMethod   VerificationMethod?
  verifiedDomain   String?
  disputedAt       DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  owner            User?     @relation("VenueOwner", fields: [ownerId], references: [id])
  tendencies       SessionTendency[]
  jamSessions      JamSession[]
  posts            VenuePost[]
  collectionJobs   AutoCollectionJob[]
}

// Session tendency: "what usually happens here" (not a specific event date)
// Multiple per venue — because Thursday jazz and Saturday rock are different
model SessionTendency {
  id               String   @id @default(cuid())
  venueId          String
  name             String   // e.g., "Thursday Night Jazz Session"
  typicalDayOfWeek Int?     // 0=Sun, 1=Mon, ..., 6=Sat (nullable = irregular)
  typicalStartTime String?  // "19:00" format
  typicalEndTime   String?  // "22:00" format
  genres           String[] // ["Jazz", "Blues"]
  atmosphere       String?  // free text
  levelRange       String?  // "Beginner-friendly" / "Intermediate+" / etc.
  entrySystem      String?  // "Free" / "¥500" / "One drink min"
  capacity         Int?
  houseEquipment   String?
  equipmentDetails String?
  sourceType       SourceType @default(CROWDSOURCED)
  sourceUserId     String?  // who wrote this (null = auto-collected)
  sourceUrl        String?  // URL of auto-collected source
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  venue            Venue    @relation(fields: [venueId], references: [id], onDelete: Cascade)
  sourceUser       User?    @relation(fields: [sourceUserId], references: [id])
}

// ─────────────────────────────────────
// Studio (rehearsal studios)
// ─────────────────────────────────────

model Studio {
  id               String   @id @default(cuid())
  name             String
  address          String?
  nearestStation   String?
  walkingMinutes   Int?
  lat              Float?
  lng              Float?
  websiteUrl       String?
  phone            String?
  openingHours     String?
  bookingMethod    String?
  ownerId          String?
  verifiedAt       DateTime?
  disputedAt       DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  owner            User?     @relation("StudioOwner", fields: [ownerId], references: [id])
  rooms            StudioRoom[]
  jamSessions      JamSession[]
  collectionJobs   AutoCollectionJob[]
}

model StudioRoom {
  id               String   @id @default(cuid())
  studioId         String
  name             String   // "Room A", "Studio 3"
  capacityPersons  Int?
  sizeSqm          Float?
  hasDrums         Boolean  @default(false)
  drumSpec         String?
  hasPA            Boolean  @default(false)
  paSpec           String?
  hasPiano         Boolean  @default(false)
  hasAmps          Boolean  @default(false)
  hasMics          Boolean  @default(false)
  otherEquipment   String?
  hourlyRateYen    Int?
  hourlyRatePeak   Int?     // peak-time rate
  minBookingHours  Int?     @default(1)
  notes            String?
  createdAt        DateTime @default(now())

  studio           Studio   @relation(fields: [studioId], references: [id], onDelete: Cascade)
  jamSessions      JamSession[]
}

// ─────────────────────────────────────
// Songs
// ─────────────────────────────────────

model Song {
  id              String    @id @default(cuid())
  title           String
  artist          String?
  genre           String?
  standardKey     String?
  tempoMin        Int?
  tempoMax        Int?
  difficulty      SongDifficulty @default(INTERMEDIATE)
  tags            String[]
  externalLinks   Json?     // {chordwiki: url, youtube: url}
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  wishes          SongWish[]
  sessionSongs    JamSessionSong[]
}

model SongWish {
  id              String   @id @default(cuid())
  userId          String
  songId          String
  preferredKey    String?
  createdAt       DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  song            Song     @relation(fields: [songId], references: [id], onDelete: Cascade)
  @@unique([userId, songId])
}

// ─────────────────────────────────────
// Jam Sessions (specific dated events)
// ─────────────────────────────────────

model JamSession {
  id              String        @id @default(cuid())
  title           String
  sessionAdminId  String
  venueId         String?
  studioId        String?
  studioRoomId    String?
  isSyncroom      Boolean       @default(false)
  syncroomInfo    String?
  format          SessionFormat @default(OPEN)
  scheduledAt     DateTime?
  endsAt          DateTime?
  maxParticipants Int?
  registrationRequired Boolean @default(false)
  moodFlags       String[]      // mood flag keys
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  sessionAdmin    User          @relation("SessionAdmin", fields: [sessionAdminId], references: [id])
  venue           Venue?        @relation(fields: [venueId], references: [id])
  studio          Studio?       @relation(fields: [studioId], references: [id])
  studioRoom      StudioRoom?   @relation(fields: [studioRoomId], references: [id])
  songs           JamSessionSong[]
  instrumentNeeds JamSessionInstrumentNeed[]
  registrations   JamSessionRegistration[]
  privacySettings JamSessionPrivacySettings?
  adminConsent    JamSessionAdminConsent?
  performanceLogs PerformanceLog[]
  kudos           Kudos[]
  feedback        AnonymousFeedback[]
  notifications   Notification[]
}

model JamSessionSong {
  id          String  @id @default(cuid())
  sessionId   String
  songId      String?
  freeText    String? // for songs not in DB
  suggestedKey String?
  order       Int     @default(0)
  session     JamSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  song        Song?   @relation(fields: [songId], references: [id])
  @@unique([sessionId, songId])
}

model JamSessionInstrumentNeed {
  id          String  @id @default(cuid())
  sessionId   String
  instrument  String
  count       Int     @default(1)
  session     JamSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

model JamSessionRegistration {
  id            String             @id @default(cuid())
  sessionId     String
  userId        String
  instrument    String?
  status        RegistrationStatus @default(REGISTERED)
  createdAt     DateTime           @default(now())
  session       JamSession         @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user          User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([sessionId, userId])
}

model JamSessionPrivacySettings {
  id              String  @id @default(cuid())
  sessionId       String  @unique
  visExistence    Boolean @default(false) // show that this session existed
  visDateTime     Boolean @default(false)
  visSessionName  Boolean @default(false)
  visSongList     Boolean @default(false)
  session         JamSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

model JamSessionAdminConsent {
  id              String  @id @default(cuid())
  sessionId       String  @unique
  consentSongList Boolean @default(false)
  consentDateTime Boolean @default(false)
  session         JamSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

// ─────────────────────────────────────
// Performance Logs
// ─────────────────────────────────────

model PerformanceLog {
  id              String  @id @default(cuid())
  sessionId       String
  userId          String
  songId          String?
  songFreeText    String?
  instrument      String?
  confirmedAt     DateTime?
  deniedAt        DateTime?
  // AND-consent visibility columns
  vis_participation   Boolean @default(false) // "I was there"
  vis_instrument      Boolean @default(false) // "I played X instrument"
  vis_song_performance Boolean @default(false) // "I played this song"
  vis_co_performers   Boolean @default(false) // "I played with these people"
  createdAt       DateTime @default(now())

  session         JamSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ─────────────────────────────────────
// Social
// ─────────────────────────────────────

model Kudos {
  id          String  @id @default(cuid())
  fromUserId  String
  toUserId    String
  sessionId   String
  stamp       String? // emoji key
  message     String?
  createdAt   DateTime @default(now())
  sender      User @relation("KudosSender", fields: [fromUserId], references: [id], onDelete: Cascade)
  receiver    User @relation("KudosReceiver", fields: [toUserId], references: [id], onDelete: Cascade)
  session     JamSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

model AnonymousFeedback {
  id          String  @id @default(cuid())
  sessionId   String
  toUserId    String  // venue owner or session admin
  content     String
  createdAt   DateTime @default(now())
  session     JamSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

model Connection {
  id          String           @id @default(cuid())
  userAId     String
  userBId     String
  status      ConnectionStatus @default(PENDING)
  rejectedAt  DateTime?
  rejectCount Int              @default(0)
  createdAt   DateTime         @default(now())
  userA       User @relation("ConnectionA", fields: [userAId], references: [id], onDelete: Cascade)
  userB       User @relation("ConnectionB", fields: [userBId], references: [id], onDelete: Cascade)
  @@unique([userAId, userBId])
}

model Block {
  id         String   @id @default(cuid())
  blockerId  String
  blockedId  String
  createdAt  DateTime @default(now())
  blocker    User @relation("Blocker", fields: [blockerId], references: [id], onDelete: Cascade)
  blocked    User @relation("Blocked", fields: [blockedId], references: [id], onDelete: Cascade)
  @@unique([blockerId, blockedId])
}

model Notification {
  id          String           @id @default(cuid())
  userId      String
  type        NotificationType
  sessionId   String?
  payload     Json?
  readAt      DateTime?
  createdAt   DateTime         @default(now())
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  session     JamSession? @relation(fields: [sessionId], references: [id], onDelete: SetNull)
}

// ─────────────────────────────────────
// Crowdsourced / Auto-collected content
// ─────────────────────────────────────

// General posts about a venue (separate from session tendencies)
model VenuePost {
  id          String     @id @default(cuid())
  venueId     String
  authorId    String?    // null = auto-collected
  sourceType  SourceType @default(CROWDSOURCED)
  sourceUrl   String?
  content     String     // free text
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  venue       Venue      @relation(fields: [venueId], references: [id], onDelete: Cascade)
  author      User?      @relation("PostAuthor", fields: [authorId], references: [id])
}

// Tracks the state of bot collection jobs per venue/studio
model AutoCollectionJob {
  id             String        @id @default(cuid())
  venueId        String?
  studioId       String?
  sourceType     String        // "instagram", "x", "hp", "facebook", "connpass"
  sourceUrl      String
  lastFetchedAt  DateTime?
  lastStatus     String?       // "success" | "error" | "pending_review"
  nextFetchAt    DateTime?
  errorMessage   String?
  createdAt      DateTime      @default(now())
  venue          Venue?        @relation(fields: [venueId], references: [id])
  studio         Studio?       @relation(fields: [studioId], references: [id])
}

// ─────────────────────────────────────
// Enums
// ─────────────────────────────────────

enum UserRole {
  MUSICIAN
  VENUE
  BOTH
  ADMIN
}

enum SkillLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  ANY
}

enum LevelPref {
  SAME_LEVEL
  BETTER_PLAYERS
  ANY
}

enum SessionGoal {
  FUN
  IMPROVE
  BOTH
}

enum PlayVolumePref {
  LOTS
  FEW_SONGS
  EITHER
}

enum ChallengePref {
  KNOWN_ONLY
  CHALLENGER
  EITHER
}

enum FeedbackPref {
  DETAILED
  LIGHT
  NONE
}

enum SessionStyle {
  DEEP
  WIDE
  EITHER
}

enum TempoPref {
  RELAXED
  MODERATE
  INTENSE
}

enum ProfileVisibility {
  PRIVATE
  LOGGED_IN
  PUBLIC
}

enum VerificationMethod {
  HP_EMAIL
  SNS_CODE
  MANUAL
}

enum SongDifficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  DEPENDS
}

enum SessionFormat {
  OPEN
  INVITE_ONLY
  THEME_NIGHT
}

enum RegistrationStatus {
  REGISTERED
  WAITLISTED
  CANCELLED
  REMOVED
}

enum ConnectionStatus {
  PENDING
  CONNECTED
  REJECTED
}

enum NotificationType {
  WISHLIST_MATCH
  INSTRUMENT_MATCH
  NEW_SESSION_NEARBY
  KUDOS_RECEIVED
  CONNECTION_REQUEST
  CONNECTION_ACCEPTED
  PERFORMANCE_LOG_CONFIRM
}

enum SourceType {
  AUTO_COLLECTED
  CROWDSOURCED
  OWNER_VERIFIED
}
```

---

## 4. API Design

### 4.1 Conventions

- All routes under `/api/v1/`
- Authentication via NextAuth.js session (cookie)
- JSON request/response
- Rate limiting on mutation endpoints (Upstash Ratelimit)
- Input validation via Zod schemas

### 4.2 Core Endpoints

#### Auth
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth.js handler |

#### Musicians
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/musicians/me` | My profile |
| PUT | `/api/v1/musicians/me` | Update profile |
| GET | `/api/v1/musicians/me/coverage-areas` | Coverage areas + SYNCROOM status |
| PUT | `/api/v1/musicians/me/coverage-areas` | Update coverage areas |
| GET | `/api/v1/musicians/me/wishlist` | My wishlist |
| POST | `/api/v1/musicians/me/wishlist` | Add song to wishlist |
| DELETE | `/api/v1/musicians/me/wishlist/:songId` | Remove song |
| GET | `/api/v1/musicians/:id` | Public profile |

#### Venues
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/venues` | List venues (with filters, geo) |
| POST | `/api/v1/venues` | Create venue (any user) |
| GET | `/api/v1/venues/:id` | Venue detail |
| PUT | `/api/v1/venues/:id` | Update (owner only) |
| POST | `/api/v1/venues/:id/verify` | Initiate verification |
| GET | `/api/v1/venues/:id/tendencies` | Session tendencies |
| POST | `/api/v1/venues/:id/tendencies` | Add tendency (any logged-in user) |
| PUT | `/api/v1/venues/:id/tendencies/:tendencyId` | Update tendency |
| POST | `/api/v1/venues/:id/posts` | Add crowdsourced post |

#### Studios
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/studios` | List studios (with filters, geo) |
| POST | `/api/v1/studios` | Create studio |
| GET | `/api/v1/studios/:id` | Studio detail with rooms |
| PUT | `/api/v1/studios/:id` | Update (owner only) |
| GET | `/api/v1/studios/:id/rooms` | List rooms |
| POST | `/api/v1/studios/:id/rooms` | Add room (owner only) |

#### Maps
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/map/places` | Venues + studios within bounding box |

#### Songs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/songs` | Search songs |
| POST | `/api/v1/songs` | Add song to DB |
| GET | `/api/v1/songs/:id` | Song detail |

#### Sessions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/sessions` | List sessions (with filters) |
| POST | `/api/v1/sessions` | Create session |
| GET | `/api/v1/sessions/:id` | Session detail |
| PUT | `/api/v1/sessions/:id` | Update (admin only) |
| POST | `/api/v1/sessions/:id/register` | Register for session |
| DELETE | `/api/v1/sessions/:id/register` | Cancel registration |
| GET | `/api/v1/sessions/:id/queue` | Song queue |
| POST | `/api/v1/sessions/:id/queue` | Add to queue |
| PUT | `/api/v1/sessions/:id/queue/:songId` | Update order / key |
| POST | `/api/v1/sessions/:id/performance-logs` | Log performance |
| PUT | `/api/v1/sessions/:id/privacy` | Update privacy settings |
| POST | `/api/v1/sessions/:id/kudos` | Send kudos |
| POST | `/api/v1/sessions/:id/feedback` | Send anonymous feedback |

---

## 5. Security

### 5.1 Authentication & Authorization

- All API routes require NextAuth.js session
- Venue/Studio mutations require `ownerId == session.user.id` check
- Session admin mutations require `sessionAdminId == session.user.id` check
- Performance log mutations only by the log's `userId`

### 5.2 Input Validation

All inputs validated with Zod at API route level before reaching DB.

### 5.3 Rate Limiting

Upstash Ratelimit on mutation endpoints (session create, registration, kudos).

### 5.4 Data Isolation

- Wishlist queries always scoped to `userId = session.user.id`
- Participant lists only returned when requester is registered for the session
- Notifications only returned for `userId = session.user.id`

### 5.5 JASRAC Risk Mitigation

| Measure | Implementation |
|---------|---------------|
| Performance log pages: `noindex` | `X-Robots-Tag: noindex` header + robots.txt |
| Auth gate on performance logs | Middleware: redirect to login if unauthenticated |
| Song titles not in public API | `/api/v1/songs` requires auth |
| Bulk export disabled | No endpoint returns full performance log dump |

---

## 6. Google Maps Integration

### 6.1 API Keys

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — frontend JS API (Maps display)
- `GOOGLE_MAPS_GEOCODING_API_KEY` — server-side only (Geocoding)

Restrict Maps JS API key to referer (domain) in Google Cloud Console.
Restrict Geocoding API key to server IP or no HTTP referer restriction (server-side only).

### 6.2 Geocoding Flow

```
1. User submits venue/studio address
2. Server calls Geocoding API: GET https://maps.googleapis.com/maps/api/geocode/json
3. Store lat/lng in Venue.lat / Venue.lng
4. On subsequent page loads, use cached lat/lng — NO API call
5. Only re-geocode if address field changes
```

### 6.3 Map View API

```
GET /api/v1/map/places?swLat=X&swLng=Y&neLat=A&neLng=B&type=venue,studio
```

Returns venues and studios within the bounding box. Pagination for large result sets.

No geocoding API calls at query time — uses cached `lat`/`lng` in DB.

---

## 7. Auto-Collection Bot

### 7.1 Architecture

Azure Functions Timer Trigger — runs on a schedule (e.g., daily at 03:00 JST).

```
AutoCollectionJob table → pending jobs
  ↓
For each job where nextFetchAt <= now():
  1. Fetch source URL (HP, Instagram, X, etc.)
  2. Extract text content (HTML → text, or API response)
  3. Send to Claude API with extraction prompt
  4. Parse JSON response → map to SessionTendency / VenuePost schema
  5. Insert as sourceType=AUTO_COLLECTED, isActive=false (pending review)
  6. Notify operators of new pending items
  7. Update lastFetchedAt, nextFetchAt (+7 days), lastStatus
```

### 7.2 Extraction Prompt (Claude API)

```
Given the following text from a venue's website/SNS, extract session information.
Return a JSON array of session tendencies with fields:
- name: string (session name or "Unknown")
- typicalDayOfWeek: number (0-6) or null
- typicalStartTime: string (HH:MM) or null
- genres: string[]
- atmosphere: string or null
- entrySystem: string or null

Text:
[VENUE_TEXT]
```

### 7.3 Review Flow

1. Auto-collected items have `isActive = false`
2. Operator reviews at `/admin/collection-queue`
3. Approve → `isActive = true, sourceType = AUTO_COLLECTED`
4. Reject → delete or mark as spam
5. Edit before approval → `sourceType = CROWDSOURCED` (human touched)

---

## 8. Azure Infrastructure

| Resource | SKU | Purpose |
|---------|-----|---------|
| Azure Static Web Apps | Free | Frontend + API Routes |
| Azure DB for PostgreSQL Flexible | Standard_B1ms (Burstable) | Database |
| Azure Functions | Consumption | Auto-collection bot |

### Environment Variables

| Variable | Where used | Notes |
|----------|-----------|-------|
| `DATABASE_URL` | Server | PostgreSQL connection string |
| `AUTH_SECRET` | Server | NextAuth.js secret |
| `AUTH_URL` | Server | Public URL of the app |
| `AUTH_GOOGLE_ID` | Server | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Server | Google OAuth client secret |
| `ANTHROPIC_API_KEY` | Server | Claude API for AI features + bot |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client | Maps JS API |
| `GOOGLE_MAPS_GEOCODING_API_KEY` | Server | Geocoding API (server-side only) |

---

## 9. Matching Algorithm

```
# In-person session
score = song_overlap × 0.4 + area_fit × 0.3 + style_fit × 0.2 + instrument_fit × 0.1

# SYNCROOM session
score = song_overlap × 0.5 + style_fit × 0.35 + instrument_fit × 0.15
```

**area_fit** now considers `MusicianCoverageArea`:
- If venue is within `travelRange` of `homeArea` → 1.0
- If venue is in any of the musician's `coverageAreas` → 0.8
- Otherwise → 0.0

**style_fit** components:
- Skill level match
- Play volume preference
- Challenge attitude
- Feedback preference
- Session style (deep vs broad)

Notifications are batch-delivered once daily (morning digest) to prevent wishlist timing-correlation attacks.

---

## 10. Phase 0 Status (Completed 2026-02-26)

- [x] Next.js 16 project initialized
- [x] Full Prisma schema (20+ tables)
- [x] Docker Compose local dev environment
- [x] Azure PostgreSQL Flexible Server created (`psql-nearjam`, japaneast)
- [x] Azure Static Web Apps created (`swa-nearjam`)
- [x] GitHub Actions CI/CD pipeline (npm ci → prisma generate → migrate deploy → build → SWA deploy)
- [x] GitHub Secrets configured
- [x] Initial migration applied (local + production)
- [x] Seed data: 8 songs, 3 users, 1 venue, 2 musician profiles, 1 session
- [x] Production deployment confirmed (HTTP 200)

> **Note**: Schema in code is still v0.2. Phase 0.5 migration needed to add `Studio`, `StudioRoom`, `MusicianCoverageArea`, `SessionTendency` (refactored from `VenueProfile`), `AutoCollectionJob`, `VenuePost` — and Google Maps fields to `Venue`.

---

## 11. Next Steps

| Phase | Items |
|-------|-------|
| **Phase 0.5** (schema migration) | Migrate schema to v0.3: add Studio, StudioRoom, MusicianCoverageArea, SessionTendency, VenuePost, AutoCollectionJob. Add lat/lng to Venue. |
| **Phase 1** | Auth UI, musician profile form, venue registration, basic session creation, Google Maps view |
| **Phase 1.5** | Auto-collection bot (Azure Functions), crowdsourced tendency submission UI |
| **Phase 2** | Matching engine, notification system, in-session tools |
