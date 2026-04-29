-- CreateEnum
CREATE TYPE "JobEmploymentStatus" AS ENUM ('ACTIVE', 'FIRED', 'QUIT');

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'JOB_FAILED';
ALTER TYPE "ActivityType" ADD VALUE 'JOB_HIRED';
ALTER TYPE "ActivityType" ADD VALUE 'JOB_FIRED';
ALTER TYPE "ActivityType" ADD VALUE 'JOB_QUIT';
ALTER TYPE "ActivityType" ADD VALUE 'JOB_STRIKE';

-- CreateTable
CREATE TABLE "JobEmployment" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "hiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastShiftAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "strikes" INTEGER NOT NULL DEFAULT 0,
    "status" "JobEmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "cadenceHours" INTEGER NOT NULL DEFAULT 24,
    "totalShiftsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalCreditsEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobEmployment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobEmployment_characterId_opportunityId_key" ON "JobEmployment"("characterId", "opportunityId");

-- AddForeignKey
ALTER TABLE "JobEmployment" ADD CONSTRAINT "JobEmployment_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobEmployment" ADD CONSTRAINT "JobEmployment_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "OpportunityDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
