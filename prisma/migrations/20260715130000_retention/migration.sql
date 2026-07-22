-- Retention: daily supply-drop claims and achievement records
CREATE TABLE "DailyClaim" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 1,
    "creditsAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AchievementRecord" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "creditsAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AchievementRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DailyClaim_playerId_claimedAt_idx" ON "DailyClaim"("playerId", "claimedAt");
CREATE UNIQUE INDEX "AchievementRecord_playerId_achievementId_key" ON "AchievementRecord"("playerId", "achievementId");

ALTER TABLE "DailyClaim" ADD CONSTRAINT "DailyClaim_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AchievementRecord" ADD CONSTRAINT "AchievementRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TYPE "ActivityType" ADD VALUE 'DAILY_CLAIMED';
ALTER TYPE "ActivityType" ADD VALUE 'ACHIEVEMENT_EARNED';
