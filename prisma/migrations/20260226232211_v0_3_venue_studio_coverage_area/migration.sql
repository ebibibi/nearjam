/*
  Warnings:

  - You are about to drop the `VenueProfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('AUTO_COLLECTED', 'CROWDSOURCED', 'OWNER_VERIFIED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "AnonymousFeedback" DROP CONSTRAINT "AnonymousFeedback_toVenueId_fkey";

-- DropForeignKey
ALTER TABLE "JamSession" DROP CONSTRAINT "JamSession_venueId_fkey";

-- DropForeignKey
ALTER TABLE "Kudos" DROP CONSTRAINT "Kudos_toVenueId_fkey";

-- DropForeignKey
ALTER TABLE "VenueProfile" DROP CONSTRAINT "VenueProfile_userId_fkey";

-- AlterTable
ALTER TABLE "JamSession" ADD COLUMN     "studioId" TEXT,
ADD COLUMN     "studioRoomId" TEXT;

-- AlterTable
ALTER TABLE "MusicianProfile" ALTER COLUMN "areaLabel" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "nickname" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- DropTable
DROP TABLE "VenueProfile";

-- CreateTable
CREATE TABLE "MusicianCoverageArea" (
    "id" TEXT NOT NULL,
    "musicianProfileId" TEXT NOT NULL,
    "areaLabel" TEXT NOT NULL,
    "areaLat" DOUBLE PRECISION,
    "areaLng" DOUBLE PRECISION,
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "isSyncroom" BOOLEAN NOT NULL DEFAULT false,
    "syncroomNotes" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MusicianCoverageArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "nearestStation" TEXT,
    "walkMinutes" INTEGER,
    "websiteUrl" TEXT,
    "instagramUrl" TEXT,
    "xUrl" TEXT,
    "facebookUrl" TEXT,
    "bookingUrl" TEXT,
    "bookingPhone" TEXT,
    "rulesMarkdown" TEXT,
    "ownerId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedMethod" "VerificationMethod",
    "verifiedDomain" TEXT,
    "disputedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionTendency" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typicalDayOfWeek" INTEGER,
    "typicalStartTime" TEXT,
    "typicalEndTime" TEXT,
    "genres" TEXT[],
    "atmosphere" TEXT,
    "levelRange" TEXT,
    "entrySystem" TEXT,
    "capacity" INTEGER,
    "houseEquipment" TEXT,
    "equipmentDetails" TEXT,
    "sourceType" "SourceType" NOT NULL DEFAULT 'CROWDSOURCED',
    "sourceUserId" TEXT,
    "sourceUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionTendency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenuePost" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "authorId" TEXT,
    "sourceType" "SourceType" NOT NULL DEFAULT 'CROWDSOURCED',
    "sourceUrl" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenuePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoCollectionJob" (
    "id" TEXT NOT NULL,
    "venueId" TEXT,
    "studioId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "lastFetchedAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "nextFetchAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutoCollectionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Studio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "nearestStation" TEXT,
    "walkMinutes" INTEGER,
    "websiteUrl" TEXT,
    "phone" TEXT,
    "openingHours" TEXT,
    "bookingMethod" TEXT,
    "ownerId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioRoom" (
    "id" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacityPersons" INTEGER,
    "sizeSqm" DOUBLE PRECISION,
    "hasDrums" BOOLEAN NOT NULL DEFAULT false,
    "drumSpec" TEXT,
    "hasPA" BOOLEAN NOT NULL DEFAULT false,
    "paSpec" TEXT,
    "hasPiano" BOOLEAN NOT NULL DEFAULT false,
    "hasAmps" BOOLEAN NOT NULL DEFAULT false,
    "hasMics" BOOLEAN NOT NULL DEFAULT false,
    "otherEquipment" TEXT,
    "hourlyRateYen" INTEGER,
    "hourlyRatePeak" INTEGER,
    "minBookingHours" INTEGER DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MusicianCoverageArea_musicianProfileId_idx" ON "MusicianCoverageArea"("musicianProfileId");

-- CreateIndex
CREATE INDEX "Venue_lat_lng_idx" ON "Venue"("lat", "lng");

-- CreateIndex
CREATE INDEX "SessionTendency_venueId_idx" ON "SessionTendency"("venueId");

-- CreateIndex
CREATE INDEX "VenuePost_venueId_idx" ON "VenuePost"("venueId");

-- CreateIndex
CREATE INDEX "AutoCollectionJob_nextFetchAt_idx" ON "AutoCollectionJob"("nextFetchAt");

-- CreateIndex
CREATE INDEX "Studio_lat_lng_idx" ON "Studio"("lat", "lng");

-- CreateIndex
CREATE INDEX "StudioRoom_studioId_idx" ON "StudioRoom"("studioId");

-- AddForeignKey
ALTER TABLE "MusicianCoverageArea" ADD CONSTRAINT "MusicianCoverageArea_musicianProfileId_fkey" FOREIGN KEY ("musicianProfileId") REFERENCES "MusicianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTendency" ADD CONSTRAINT "SessionTendency_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTendency" ADD CONSTRAINT "SessionTendency_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenuePost" ADD CONSTRAINT "VenuePost_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenuePost" ADD CONSTRAINT "VenuePost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoCollectionJob" ADD CONSTRAINT "AutoCollectionJob_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoCollectionJob" ADD CONSTRAINT "AutoCollectionJob_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Studio" ADD CONSTRAINT "Studio_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioRoom" ADD CONSTRAINT "StudioRoom_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSession" ADD CONSTRAINT "JamSession_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSession" ADD CONSTRAINT "JamSession_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JamSession" ADD CONSTRAINT "JamSession_studioRoomId_fkey" FOREIGN KEY ("studioRoomId") REFERENCES "StudioRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kudos" ADD CONSTRAINT "Kudos_toVenueId_fkey" FOREIGN KEY ("toVenueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousFeedback" ADD CONSTRAINT "AnonymousFeedback_toVenueId_fkey" FOREIGN KEY ("toVenueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
