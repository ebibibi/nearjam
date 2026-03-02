-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "googlePlaceId" TEXT,
ADD COLUMN     "photoUrls" TEXT[],
ADD COLUMN     "photosUpdatedAt" TIMESTAMP(3);
