-- Replayable ticks: persist the per-tick random seed
ALTER TABLE "SimulationTick" ADD COLUMN "randomSeed" DOUBLE PRECISION;
