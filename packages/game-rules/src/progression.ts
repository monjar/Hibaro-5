/**
 * Runtime ceiling for any single skill stat. Character creation caps
 * allocation lower (see character-creation.ts); STAT_XP gains and gear can
 * push stats up to this value but never past it, keeping the d20 check
 * math meaningful at high level.
 */
export const STAT_CAP = 20;
