-- Player housing: rent safehouses for storage and passive benefits
ALTER TYPE "ItemOwnerType" ADD VALUE 'HOUSING';
ALTER TYPE "ActivityType" ADD VALUE 'HOUSING_RENTED';
ALTER TYPE "ActivityType" ADD VALUE 'HOUSING_ENDED';
ALTER TYPE "ActivityType" ADD VALUE 'RENT_PAID';

CREATE TYPE "CharacterHousingStatus" AS ENUM ('ACTIVE', 'ENDED', 'EVICTED');

CREATE TABLE "CharacterHousing" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "rentPerDay" DOUBLE PRECISION NOT NULL,
    "nextRentDueAt" TIMESTAMP(3) NOT NULL,
    "status" "CharacterHousingStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalRentPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CharacterHousing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CharacterHousing_characterId_status_idx" ON "CharacterHousing"("characterId", "status");
CREATE INDEX "CharacterHousing_status_nextRentDueAt_idx" ON "CharacterHousing"("status", "nextRentDueAt");

ALTER TABLE "CharacterHousing" ADD CONSTRAINT "CharacterHousing_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CharacterHousing" ADD CONSTRAINT "CharacterHousing_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
