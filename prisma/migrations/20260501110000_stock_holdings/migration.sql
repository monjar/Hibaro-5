-- CreateTable
CREATE TABLE "StockHolding" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "corporationId" TEXT NOT NULL,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "averagePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockHolding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockHolding_characterId_corporationId_key" ON "StockHolding"("characterId", "corporationId");

-- AddForeignKey
ALTER TABLE "StockHolding" ADD CONSTRAINT "StockHolding_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockHolding" ADD CONSTRAINT "StockHolding_corporationId_fkey" FOREIGN KEY ("corporationId") REFERENCES "Corporation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
