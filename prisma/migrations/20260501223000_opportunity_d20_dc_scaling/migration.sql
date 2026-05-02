UPDATE "OpportunityDefinition"
SET "difficulty" = 8 + ("difficulty" * 2)
WHERE "difficulty" BETWEEN 1 AND 10;