ALTER TABLE "District"
ADD COLUMN "mapWidth" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN "mapHeight" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN "mapTiles" JSONB NOT NULL DEFAULT '[]';

ALTER TABLE "Building"
ADD COLUMN "gridX" INTEGER,
ADD COLUMN "gridY" INTEGER;

CREATE UNIQUE INDEX "Building_district_grid_unique"
  ON "Building"("districtId", "gridX", "gridY")
  WHERE "gridX" IS NOT NULL AND "gridY" IS NOT NULL;
