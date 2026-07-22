-- Equipment: items can be equipped into one of four slots
CREATE TYPE "EquipmentSlot" AS ENUM ('WEAPON', 'OUTFIT', 'TOOL', 'VEHICLE');

ALTER TABLE "ItemInstance" ADD COLUMN "equippedSlot" "EquipmentSlot";

CREATE INDEX "ItemInstance_ownerType_ownerId_equippedSlot_idx"
  ON "ItemInstance"("ownerType", "ownerId", "equippedSlot");
