-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MUSICIAN', 'VENUE', 'BOTH');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ANY');

-- CreateEnum
CREATE TYPE "LevelPref" AS ENUM ('SAME_LEVEL', 'JOIN_BETTER', 'EITHER');

-- CreateEnum
CREATE TYPE "SessionGoal" AS ENUM ('FUN', 'IMPROVE', 'BOTH');

-- CreateEnum
CREATE TYPE "PlayVolumePref" AS ENUM ('LOTS', 'SPECIFIC_ONLY', 'EITHER');

-- CreateEnum
CREATE TYPE "ChallengePref" AS ENUM ('KNOWN_ONLY', 'CHALLENGE', 'EITHER');

-- CreateEnum
CREATE TYPE "FeedbackPref" AS ENUM ('WELCOME', 'LIGHT', 'NONE');

-- CreateEnum
CREATE TYPE "SessionStyle" AS ENUM ('DEEP', 'VARIETY', 'EITHER');

-- CreateEnum
CREATE TYPE "TempoPref" AS ENUM ('SLOW', 'MODERATE', 'FAST');

-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PRIVATE', 'LOGGED_IN', 'PUBLIC');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('HP_EMAIL', 'SNS_CODE', 'MANUAL');

-- CreateEnum
CREATE TYPE "SongDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'VARIES');

-- CreateEnum
CREATE TYPE "SessionFormat" AS ENUM ('OPEN', 'INVITE', 'THEME');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('INTERESTED', 'CONFIRMED', 'ATTENDED');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MATCH_SESSION', 'MATCH_INSTRUMENT', 'CONNECTION_REQUEST', 'CONNECTION_ACCEPTED', 'KUDOS_RECEIVED', 'LOG_CONFIRM_REQUEST');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MUSICIAN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicianProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "areaLabel" TEXT NOT NULL,
    "areaLat" DOUBLE PRECISION,
    "areaLng" DOUBLE PRECISION,
    "travelRadiusKm" INTEGER NOT NULL DEFAULT 15,
    "skillLevel" "SkillLevel" NOT NULL DEFAULT 'BEGINNER',
    "levelPref" "LevelPref" NOT NULL DEFAULT 'EITHER',
    "sessionGoal" "SessionGoal" NOT NULL DEFAULT 'BOTH',
    "playVolumePref" "PlayVolumePref" NOT NULL DEFAULT 'EITHER',
    "challengePref" "ChallengePref" NOT NULL DEFAULT 'EITHER',
    "feedbackPref" "FeedbackPref" NOT NULL DEFAULT 'LIGHT',
    "sessionStyle" "SessionStyle" NOT NULL DEFAULT 'EITHER',
    "tempoPref" "TempoPref" NOT NULL DEFAULT 'MODERATE',
    "yearsPlaying" INTEGER,
    "snsLinks" JSONB NOT NULL DEFAULT '{}',
    "profileVisibility" "ProfileVisibility" NOT NULL DEFAULT 'LOGGED_IN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicianProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicianInstrument" (
    "id" TEXT NOT NULL,
    "musicianProfileId" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "proficiency" TEXT,

    CONSTRAINT "MusicianInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MusicianGenre" (
    "id" TEXT NOT NULL,
    "musicianProfileId" TEXT NOT NULL,
    "genre" TEXT NOT NULL,

    CONSTRAINT "MusicianGenre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "nearestStation" TEXT,
    "walkMinutes" INTEGER,
    "capacity" INTEGER,
    "sessionFrequency" TEXT,
    "houseInstruments" JSONB NOT NULL DEFAULT '[]',
    "equipmentDetails" TEXT,
    "rulesMarkdown" TEXT,
    "entranceInfo" TEXT,
    "bookingUrl" TEXT,
    "bookingPhone" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedMethod" "VerificationMethod",
    "verifiedDomain" TEXT,
    "disputedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT,
    "genre" TEXT,
    "typicalKey" TEXT,
    "typicalBpmMin" INTEGER,
    "typicalBpmMax" INTEGER,
    "difficulty" "SongDifficulty" NOT NULL DEFAULT 'VARIES',
    "tags" TEXT[],
    "chordwikiUrl" TEXT,
    "wishlistCount" INTEGER NOT NULL DEFAULT 0,
    "submittedById" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongWish" (
    "id" TEXT NOT NULL,
    "musicianProfileId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "preferredInstrument" TEXT,
    "preferredKey" TEXT,
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongWish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamSession" (
    "id" TEXT NOT NULL,
    "venueId" TEXT,
    "sessionAdminId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "format" "SessionFormat" NOT NULL DEFAULT 'OPEN',
    "isSyncroom" BOOLEAN NOT NULL DEFAULT false,
    "syncroomInfo" JSONB,
    "moodFlags" TEXT[],
    "maxParticipants" INTEGER,
    "registrationRequired" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamSessionSong" (
    "id" TEXT NOT NULL,
    "jamSessionId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "keyOverride" TEXT,
    "bpmOverride" INTEGER,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "JamSessionSong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamSessionInstrumentNeed" (
    "id" TEXT NOT NULL,
    "jamSessionId" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "countNeeded" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "JamSessionInstrumentNeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamSessionRegistration" (
    "id" TEXT NOT NULL,
    "jamSessionId" TEXT NOT NULL,
    "musicianProfileId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'INTERESTED',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JamSessionRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamSessionPrivacySettings" (
    "id" TEXT NOT NULL,
    "jamSessionId" TEXT NOT NULL,
    "controlledById" TEXT NOT NULL,
    "visSessionFact" BOOLEAN NOT NULL DEFAULT false,
    "visDatetime" BOOLEAN NOT NULL DEFAULT false,
    "visSessionName" BOOLEAN NOT NULL DEFAULT false,
    "visSongListVenue" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JamSessionPrivacySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JamSessionAdminConsent" (
    "id" TEXT NOT NULL,
    "jamSessionId" TEXT NOT NULL,
    "sessionAdminId" TEXT NOT NULL,
    "visSongList" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JamSessionAdminConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceLog" (
    "id" TEXT NOT NULL,
    "jamSessionId" TEXT NOT NULL,
    "musicianProfileId" TEXT NOT NULL,
    "songId" TEXT,
    "registeredById" TEXT NOT NULL,
    "instrumentPlayed" TEXT,
    "wasSoloist" BOOLEAN NOT NULL DEFAULT false,
    "orderInSession" INTEGER,
    "performedAt" TIMESTAMP(3),
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "visParticipation" BOOLEAN NOT NULL DEFAULT false,
    "visInstrument" BOOLEAN NOT NULL DEFAULT false,
    "visSongPerformance" BOOLEAN NOT NULL DEFAULT false,
    "visCoPerformers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kudos" (
    "id" TEXT NOT NULL,
    "jamSessionId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT,
    "toVenueId" TEXT,
    "stamp" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kudos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonymousFeedback" (
    "id" TEXT NOT NULL,
    "jamSessionId" TEXT NOT NULL,
    "toUserId" TEXT,
    "toVenueId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonymousFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "blockerUserId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MusicianProfile_userId_key" ON "MusicianProfile"("userId");

-- CreateIndex
CREATE INDEX "MusicianInstrument_musicianProfileId_idx" ON "MusicianInstrument"("musicianProfileId");

-- CreateIndex
CREATE INDEX "MusicianGenre_musicianProfileId_idx" ON "MusicianGenre"("musicianProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueProfile_userId_key" ON "VenueProfile"("userId");

-- CreateIndex
CREATE INDEX "Song_title_idx" ON "Song"("title");

-- CreateIndex
CREATE INDEX "Song_artist_idx" ON "Song"("artist");

-- CreateIndex
CREATE UNIQUE INDEX "SongWish_musicianProfileId_songId_key" ON "SongWish"("musicianProfileId", "songId");

-- CreateIndex
CREATE INDEX "JamSession_startsAt_idx" ON "JamSession"("startsAt");

-- CreateIndex
CREATE INDEX "JamSession_venueId_idx" ON "JamSession"("venueId");

-- CreateIndex
CREATE INDEX "JamSessionSong_jamSessionId_idx" ON "JamSessionSong"("jamSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "JamSessionRegistration_jamSessionId_musicianProfileId_key" ON "JamSessionRegistration"("jamSessionId", "musicianProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "JamSessionPrivacySettings_jamSessionId_key" ON "JamSessionPrivacySettings"("jamSessionId");

-- CreateIndex
CREATE INDEX "JamSessionPrivacySettings_jamSessionId_idx" ON "JamSessionPrivacySettings"("jamSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "JamSessionAdminConsent_jamSessionId_key" ON "JamSessionAdminConsent"("jamSessionId");

-- CreateIndex
CREATE INDEX "PerformanceLog_jamSessionId_idx" ON "PerformanceLog"("jamSessionId");

-- CreateIndex
CREATE INDEX "PerformanceLog_musicianProfileId_idx" ON "PerformanceLog"("musicianProfileId");

-- CreateIndex
CREATE INDEX "Kudos_toUserId_idx" ON "Kudos"("toUserId");

-- CreateIndex
CREATE INDEX "Kudos_toVenueId_idx" ON "Kudos"("toVenueId");

-- CreateIndex
CREATE UNIQUE INDEX "Kudos_jamSessionId_fromUserId_toUserId_key" ON "Kudos"("jamSessionId", "fromUserId", "toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Kudos_jamSessionId_fromUserId_toVenueId_key" ON "Kudos"("jamSessionId", "fromUserId", "toVenueId");

-- CreateIndex
CREATE INDEX "Connection_toUserId_idx" ON "Connection"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_fromUserId_toUserId_key" ON "Connection"("fromUserId", "toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerUserId_blockedUserId_key" ON "Block"("blockerUserId", "blockedUserId");

-- CreateIndex
CREATE INDEX "Notification_userId_sent_idx" ON "Notification"("userId", "sent");

-- CreateIndex
CREATE INDEX "Notification_scheduledFor_sent_idx" ON "Notification"("scheduledFor", "sent");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicianProfile" ADD CONSTRAINT "MusicianProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicianInstrument" ADD CONSTRAINT "MusicianInstrument_musicianProfileId_fkey" FOREIGN KEY ("musicianProfileId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MusicianGenre" ADD CONSTRAINT "MusicianGenre_musicianProfileId_fkey" FOREIGN KEY ("musicianProfileId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueProfile" ADD CONSTRAINT "VenueProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongWish" ADD CONSTRAINT "SongWish_musicianProfileId_fkey" FOREIGN KEY ("musicianProfileId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongWish" ADD CONSTRAINT "SongWish_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSession" ADD CONSTRAINT "JamSession_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "VenueProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSession" ADD CONSTRAINT "JamSession_sessionAdminId_fkey" FOREIGN KEY ("sessionAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSessionSong" ADD CONSTRAINT "JamSessionSong_jamSessionId_fkey" FOREIGN KEY ("jamSessionId") REFERENCES "JamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSessionSong" ADD CONSTRAINT "JamSessionSong_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSessionInstrumentNeed" ADD CONSTRAINT "JamSessionInstrumentNeed_jamSessionId_fkey" FOREIGN KEY ("jamSessionId") REFERENCES "JamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSessionRegistration" ADD CONSTRAINT "JamSessionRegistration_jamSessionId_fkey" FOREIGN KEY ("jamSessionId") REFERENCES "JamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSessionRegistration" ADD CONSTRAINT "JamSessionRegistration_musicianProfileId_fkey" FOREIGN KEY ("musicianProfileId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSessionPrivacySettings" ADD CONSTRAINT "JamSessionPrivacySettings_jamSessionId_fkey" FOREIGN KEY ("jamSessionId") REFERENCES "JamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSessionAdminConsent" ADD CONSTRAINT "JamSessionAdminConsent_jamSessionId_fkey" FOREIGN KEY ("jamSessionId") REFERENCES "JamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceLog" ADD CONSTRAINT "PerformanceLog_jamSessionId_fkey" FOREIGN KEY ("jamSessionId") REFERENCES "JamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceLog" ADD CONSTRAINT "PerformanceLog_musicianProfileId_fkey" FOREIGN KEY ("musicianProfileId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceLog" ADD CONSTRAINT "PerformanceLog_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceLog" ADD CONSTRAINT "PerformanceLog_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kudos" ADD CONSTRAINT "Kudos_jamSessionId_fkey" FOREIGN KEY ("jamSessionId") REFERENCES "JamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kudos" ADD CONSTRAINT "Kudos_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kudos" ADD CONSTRAINT "Kudos_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kudos" ADD CONSTRAINT "Kudos_toVenueId_fkey" FOREIGN KEY ("toVenueId") REFERENCES "VenueProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousFeedback" ADD CONSTRAINT "AnonymousFeedback_jamSessionId_fkey" FOREIGN KEY ("jamSessionId") REFERENCES "JamSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousFeedback" ADD CONSTRAINT "AnonymousFeedback_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousFeedback" ADD CONSTRAINT "AnonymousFeedback_toVenueId_fkey" FOREIGN KEY ("toVenueId") REFERENCES "VenueProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
