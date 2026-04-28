-- CreateEnum
CREATE TYPE "CharacterType" AS ENUM ('PLAYER', 'NPC');

-- CreateEnum
CREATE TYPE "PlanetType" AS ENUM ('TERRESTRIAL', 'GAS_GIANT', 'ICE', 'DESERT', 'OCEAN', 'ASTEROID_BELT', 'STATION');

-- CreateEnum
CREATE TYPE "BuildingOwnerType" AS ENUM ('CHARACTER', 'FACTION', 'CORPORATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "BuildingStatus" AS ENUM ('OPEN', 'CLOSED', 'DAMAGED', 'ABANDONED', 'LOCKED_DOWN');

-- CreateEnum
CREATE TYPE "BuildingFunction" AS ENUM ('SHOP', 'SAFEHOUSE', 'OFFICE', 'HUB', 'DOCK', 'BAR', 'CLINIC', 'WAREHOUSE', 'BLACK_MARKET', 'MISSION_BOARD');

-- CreateEnum
CREATE TYPE "FactionMembershipStatus" AS ENUM ('ACTIVE', 'EXILED', 'BETRAYER', 'HONOURED');

-- CreateEnum
CREATE TYPE "CorporationIndustry" AS ENUM ('MINING', 'WEAPONS', 'TRANSPORT', 'CYBERNETICS', 'FOOD', 'SECURITY', 'MEDIA', 'ENERGY', 'MEDICAL', 'LOGISTICS', 'BLACK_MARKET');

-- CreateEnum
CREATE TYPE "CorporationStatus" AS ENUM ('GROWING', 'STABLE', 'DECLINING', 'BANKRUPT');

-- CreateEnum
CREATE TYPE "ItemCategory" AS ENUM ('TOOL', 'WEAPON', 'CLOTHING', 'VEHICLE', 'CONSUMABLE', 'MATERIAL', 'QUEST_ITEM');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'ILLEGAL');

-- CreateEnum
CREATE TYPE "ItemOwnerType" AS ENUM ('CHARACTER', 'FACTION', 'CORPORATION', 'BUILDING');

-- CreateEnum
CREATE TYPE "OpportunityKind" AS ENUM ('GIG', 'JOB', 'QUEST');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('DELIVERY', 'BOUNTY', 'ESCORT', 'HACKING', 'SMUGGLING', 'ASSASSINATION', 'INVESTIGATION', 'MINING', 'TRADING', 'DIPLOMACY', 'SECURITY', 'REPAIR', 'STORY', 'WORLD');

-- CreateEnum
CREATE TYPE "OpportunityPostedByType" AS ENUM ('CHARACTER', 'FACTION', 'CORPORATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "OpportunityInstanceStatus" AS ENUM ('AVAILABLE', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WorldEventScope" AS ENUM ('CHARACTER', 'BUILDING', 'DISTRICT', 'PLANET', 'FACTION', 'CORPORATION', 'WORLD');

-- CreateEnum
CREATE TYPE "WorldEventStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('REPUTATION', 'LOYALTY', 'HOSTILITY', 'TRUST', 'EMPLOYMENT', 'ALLIANCE', 'RIVALRY', 'INFLUENCE', 'SPONSORSHIP');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('REGISTERED', 'LOGIN', 'LOGOUT', 'GIG_ACCEPTED', 'GIG_COMPLETED', 'GIG_FAILED', 'JOB_ACCEPTED', 'JOB_COMPLETED', 'QUEST_STARTED', 'QUEST_COMPLETED', 'ITEM_BOUGHT', 'ITEM_SOLD', 'FACTION_JOINED', 'BUILDING_ENTERED', 'COMBAT_EVENT', 'WORLD_EVENT_TRIGGERED', 'RELATIONSHIP_CHANGED', 'LOCATION_CHANGED');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CharacterType" NOT NULL DEFAULT 'PLAYER',
    "playerId" TEXT,
    "currentPlanetId" TEXT,
    "currentDistrictId" TEXT,
    "currentBuildingId" TEXT,
    "credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "health" INTEGER NOT NULL DEFAULT 100,
    "maxHealth" INTEGER NOT NULL DEFAULT 100,
    "energy" INTEGER NOT NULL DEFAULT 100,
    "maxEnergy" INTEGER NOT NULL DEFAULT 100,
    "wantedLevel" INTEGER NOT NULL DEFAULT 0,
    "strength" INTEGER NOT NULL DEFAULT 5,
    "agility" INTEGER NOT NULL DEFAULT 5,
    "intelligence" INTEGER NOT NULL DEFAULT 5,
    "charisma" INTEGER NOT NULL DEFAULT 5,
    "hacking" INTEGER NOT NULL DEFAULT 5,
    "combat" INTEGER NOT NULL DEFAULT 5,
    "stealth" INTEGER NOT NULL DEFAULT 5,
    "engineering" INTEGER NOT NULL DEFAULT 5,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolarSystem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SolarSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Planet" (
    "id" TEXT NOT NULL,
    "solarSystemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "planetType" "PlanetType" NOT NULL DEFAULT 'TERRESTRIAL',
    "dangerLevel" INTEGER NOT NULL DEFAULT 1,
    "lawLevel" INTEGER NOT NULL DEFAULT 5,
    "economyLevel" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "Planet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "planetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "controllingFactionId" TEXT,
    "dangerLevel" INTEGER NOT NULL DEFAULT 1,
    "lawLevel" INTEGER NOT NULL DEFAULT 5,
    "economyLevel" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerType" "BuildingOwnerType" NOT NULL DEFAULT 'SYSTEM',
    "ownerId" TEXT,
    "functionality" JSONB NOT NULL DEFAULT '[]',
    "status" "BuildingStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "Building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ideology" TEXT,
    "headquartersBuildingId" TEXT,
    "treasury" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "influence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Faction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FactionMembership" (
    "id" TEXT NOT NULL,
    "factionId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "rankName" TEXT NOT NULL DEFAULT 'Member',
    "loyalty" INTEGER NOT NULL DEFAULT 50,
    "reputation" INTEGER NOT NULL DEFAULT 0,
    "status" "FactionMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactionMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Corporation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "industry" "CorporationIndustry" NOT NULL,
    "headquartersBuildingId" TEXT,
    "cash" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "debt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskOfBankruptcy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "politicalInfluence" INTEGER NOT NULL DEFAULT 0,
    "status" "CorporationStatus" NOT NULL DEFAULT 'STABLE',
    "stockTicker" TEXT,
    "stockPrice" DOUBLE PRECISION,
    "stockVolatility" DOUBLE PRECISION,

    CONSTRAINT "Corporation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporationEmployment" (
    "id" TEXT NOT NULL,
    "corporationId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" TEXT NOT NULL DEFAULT 'Employee',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorporationEmployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ItemCategory" NOT NULL,
    "rarity" "ItemRarity" NOT NULL DEFAULT 'COMMON',
    "baseValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effects" JSONB,
    "requirements" JSONB,
    "weaponData" JSONB,
    "clothingData" JSONB,
    "toolData" JSONB,
    "vehicleData" JSONB,

    CONSTRAINT "ItemDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemInstance" (
    "id" TEXT NOT NULL,
    "itemDefinitionId" TEXT NOT NULL,
    "ownerType" "ItemOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "condition" INTEGER NOT NULL DEFAULT 100,
    "customName" TEXT,
    "modifiers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityDefinition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "OpportunityKind" NOT NULL,
    "postedByType" "OpportunityPostedByType" NOT NULL DEFAULT 'SYSTEM',
    "postedById" TEXT,
    "type" "OpportunityType" NOT NULL,
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "durationMinutes" INTEGER,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "rewards" JSONB NOT NULL DEFAULT '[]',
    "risks" JSONB NOT NULL DEFAULT '[]',
    "possibleEventIds" JSONB NOT NULL DEFAULT '[]',
    "repeatability" JSONB,
    "questData" JSONB,
    "startsAvailableAt" TIMESTAMP(3),
    "endsAvailableAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityInstance" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "status" "OpportunityInstanceStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completesAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "progress" JSONB,
    "rolledEvents" JSONB,
    "outcome" JSONB,

    CONSTRAINT "OpportunityInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" "WorldEventScope" NOT NULL,
    "triggeredByType" TEXT,
    "triggeredById" TEXT,
    "affectedEntities" JSONB NOT NULL DEFAULT '[]',
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "effects" JSONB NOT NULL DEFAULT '[]',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "WorldEventStatus" NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "WorldEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationshipType" "RelationshipType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "playerId" TEXT,
    "characterId" TEXT,
    "type" "ActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEntities" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationTick" (
    "id" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" JSONB NOT NULL,
    "results" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationTick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_username_key" ON "Player"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Character_playerId_key" ON "Character"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "SolarSystem_name_key" ON "SolarSystem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Planet_name_key" ON "Planet"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Faction_name_key" ON "Faction"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FactionMembership_factionId_characterId_key" ON "FactionMembership"("factionId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "Corporation_name_key" ON "Corporation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CorporationEmployment_corporationId_characterId_key" ON "CorporationEmployment"("corporationId", "characterId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemDefinition_name_key" ON "ItemDefinition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_sourceType_sourceId_targetType_targetId_relati_key" ON "Relationship"("sourceType", "sourceId", "targetType", "targetId", "relationshipType");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_currentPlanetId_fkey" FOREIGN KEY ("currentPlanetId") REFERENCES "Planet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_currentDistrictId_fkey" FOREIGN KEY ("currentDistrictId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_currentBuildingId_fkey" FOREIGN KEY ("currentBuildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planet" ADD CONSTRAINT "Planet_solarSystemId_fkey" FOREIGN KEY ("solarSystemId") REFERENCES "SolarSystem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "Planet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_controllingFactionId_fkey" FOREIGN KEY ("controllingFactionId") REFERENCES "Faction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Building" ADD CONSTRAINT "Building_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faction" ADD CONSTRAINT "Faction_headquartersBuildingId_fkey" FOREIGN KEY ("headquartersBuildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactionMembership" ADD CONSTRAINT "FactionMembership_factionId_fkey" FOREIGN KEY ("factionId") REFERENCES "Faction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FactionMembership" ADD CONSTRAINT "FactionMembership_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Corporation" ADD CONSTRAINT "Corporation_headquartersBuildingId_fkey" FOREIGN KEY ("headquartersBuildingId") REFERENCES "Building"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporationEmployment" ADD CONSTRAINT "CorporationEmployment_corporationId_fkey" FOREIGN KEY ("corporationId") REFERENCES "Corporation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporationEmployment" ADD CONSTRAINT "CorporationEmployment_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemInstance" ADD CONSTRAINT "ItemInstance_itemDefinitionId_fkey" FOREIGN KEY ("itemDefinitionId") REFERENCES "ItemDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemInstance" ADD CONSTRAINT "item_instance_character_fk" FOREIGN KEY ("ownerId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityInstance" ADD CONSTRAINT "OpportunityInstance_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "OpportunityDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityInstance" ADD CONSTRAINT "OpportunityInstance_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
