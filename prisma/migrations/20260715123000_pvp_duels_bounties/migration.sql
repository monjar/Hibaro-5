-- PVP v1: duels and player bounties
CREATE TYPE "PlayerBountyStatus" AS ENUM ('OPEN', 'CLAIMED', 'CANCELLED');

CREATE TABLE "Duel" (
    "id" TEXT NOT NULL,
    "attackerId" TEXT NOT NULL,
    "defenderId" TEXT NOT NULL,
    "districtId" TEXT,
    "wagerCredits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attackerRoll" INTEGER NOT NULL,
    "attackerTotal" DOUBLE PRECISION NOT NULL,
    "defenderRoll" INTEGER NOT NULL,
    "defenderTotal" DOUBLE PRECISION NOT NULL,
    "winnerId" TEXT NOT NULL,
    "creditsTransferred" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Duel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayerBounty" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "postedById" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" "PlayerBountyStatus" NOT NULL DEFAULT 'OPEN',
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerBounty_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Duel_attackerId_createdAt_idx" ON "Duel"("attackerId", "createdAt");
CREATE INDEX "Duel_defenderId_createdAt_idx" ON "Duel"("defenderId", "createdAt");
CREATE INDEX "PlayerBounty_status_createdAt_idx" ON "PlayerBounty"("status", "createdAt");
CREATE INDEX "PlayerBounty_targetId_status_idx" ON "PlayerBounty"("targetId", "status");

ALTER TABLE "Duel" ADD CONSTRAINT "Duel_attackerId_fkey" FOREIGN KEY ("attackerId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Duel" ADD CONSTRAINT "Duel_defenderId_fkey" FOREIGN KEY ("defenderId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerBounty" ADD CONSTRAINT "PlayerBounty_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerBounty" ADD CONSTRAINT "PlayerBounty_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerBounty" ADD CONSTRAINT "PlayerBounty_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
