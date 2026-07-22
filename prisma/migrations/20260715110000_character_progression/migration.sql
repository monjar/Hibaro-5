-- Character progression: XP, levels, spendable stat points
ALTER TABLE "Character"
  ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "unspentStatPoints" INTEGER NOT NULL DEFAULT 0;

ALTER TYPE "ActivityType" ADD VALUE 'LEVEL_UP';
ALTER TYPE "ActivityType" ADD VALUE 'STAT_TRAINED';
