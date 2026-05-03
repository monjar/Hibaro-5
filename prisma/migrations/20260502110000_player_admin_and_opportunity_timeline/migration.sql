ALTER TABLE "Player"
ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "OpportunityDefinition"
ADD COLUMN "acceptedDescription" TEXT,
ADD COLUMN "timelineEvents" JSONB NOT NULL DEFAULT '[]';

UPDATE "OpportunityDefinition"
SET "acceptedDescription" = COALESCE(
  "acceptedDescription",
  'Further details remain concealed until the operation is underway.'
);

UPDATE "OpportunityDefinition"
SET "timelineEvents" = '[{"minute":1,"description":"The operation is underway. Further updates will appear as time passes."}]'::jsonb
WHERE "timelineEvents" = '[]'::jsonb;