# Heliora — Development Plan

This file tracks planned work, active design decisions, and future ideas. Each item includes the files you'll need to touch so you can jump straight in.

**Updated 2026-07-15** with a full publishing-readiness assessment. The roadmap below is re-prioritized around what the game needs to launch publicly.

---

## Publishing-Readiness Assessment (2026-07-15)

A full audit of the codebase (game-rules, simulation, API, web app) against "ready to publish" produced this picture:

**What we have:** a visually polished, timer-driven idle RPG. Accept → wait → resolve, with a live world simulation (NPC economy, stock market, faction control, world events) running underneath. Auth, admin CMS, travel, shops, stocks, jobs/strikes, quest chains, and rest all work.

**The gaps, in order of launch impact:**

1. **No PVP or player-to-player anything.** Players cannot see, affect, or compare themselves with other players. The world is multiplayer infrastructure running a single-player game. Minimum for launch: leaderboards, direct PvP (duels), and player bounties.
2. **Waiting is boring.** The core loop has zero interaction between accept and resolve — timeline events are passive flavor text. Minimum: interactive decision points during activities so checking back in matters, plus a live world feed (NPC/market SSE events are already broadcast but never rendered).
3. **Content is far too thin.** ~7 opportunities, 9 items, 1 three-step quest chain — and every building in the game is on Antrolus. The other 4 planets have districts but no buildings, so there is literally nothing to do there. Travel, one of the most polished systems, leads nowhere. Minimum: buildings + shops + opportunities + a quest chain per planet; 3–4× the item catalog.
4. **Progression is nearly nonexistent.** No XP, no levels. Only a 50%-chance +1 stat on success, with no cap (stats can grow forever — a balance bug). Minimum: XP/level system with stat points, level-gated content, and level-up feedback.
5. **Several mechanics are silently broken.** `ITEM_REQUIRED`, `DISTRICT_ACCESS`, `PLANET_ACCESS`, `RANK_REQUIRED` requirements always fail (context never populated). Failure risks `MODIFY_CREDITS` / `MODIFY_FACTION_REPUTATION` / `MODIFY_CORPORATION_REPUTATION` are dropped by the live resolver (only wanted-level and health apply). Item `weaponData`/`clothingData`/`toolData` are stored but never used — no equipment system, so shop gear is mostly useless. Energy decays but nothing consumes it except travel. World-event `effects` JSON is never applied mechanically.
6. **No retention scaffolding.** No daily rewards, streaks, achievements, or notifications.
7. **Launch hygiene.** Login page displays test credentials; SSE stream has no reconnect; errors are swallowed on several pages; `JWT_SECRET`/`ADMIN_TOKEN` must be set in production.

---

## Up Next (publishing roadmap, in order)

### 5. PVP v1: duels, player bounties, leaderboard ⚔️
- **Duels:** challenge any player in your district; stat-contest resolution (attacker combat+agility+d20 vs defender combat+agility+d20); credit stakes; cooldowns; wanted level for unprovoked attacks; low-level protection.
- **Player bounties:** post credits on a player's head; hunters in the target's district can attempt a claim (contest vs target stealth).
- **Leaderboard:** `GET /leaderboard` (net worth, level, duel wins, bounties claimed) + web page. Makes other players visible for targeting.

**Files:** `prisma/schema.prisma` (`Duel`, `PlayerBounty` models), `apps/api/src/modules/pvp/` (new module), `packages/game-rules/src/pvp.ts` (new), `apps/web/src/app/players/page.tsx` (new), Nav.

### 6. Content expansion: make the other four planets real 🪐
- Buildings for Teraluma, Los Panko, Pigeon95, Valerina (hub/dock, shop, bar, safehouse or clinic, mission board; black markets where it fits the fiction).
- Shop stock + ~18 new item definitions including equipment with stat bonuses at tiered rarity/price.
- ~16 new opportunities spread across planets with level/stat/reputation gating.
- A quest chain per planet continuing the Pigeon95 conspiracy storyline.
- More world events.

**Files:** `prisma/seed.ts` (mostly), plus any admin/map placement data.

### 7. Retention: daily rewards & achievements 🏆
- Daily login reward with streak scaling (claim from dashboard).
- Achievements (first gig, 10 gigs, first duel win, visit all planets, level milestones, credit milestones…) with credit/XP payouts, page + toasts.

**Files:** `prisma/schema.prisma` (`DailyClaim`, `Achievement` progress), `apps/api/src/modules/progression/` or `players/`, `apps/web`.

### 8. Engagement polish 📡
- Live world feed on the dashboard consuming the already-broadcast `npc.activity.recorded` / `simulation.market.updated` SSE events.
- SSE reconnect with backoff + connection indicator.
- Remove test credentials from the login page (launch hygiene).

**Files:** `apps/web/src/lib/use-event-stream.ts`, `apps/web/src/app/page.tsx`, `apps/web/src/app/login/page.tsx`.

---

## Also queued (pre-existing, still wanted)

### Player Housing
Rent a safehouse for persistent item storage and passive energy/wanted-level recovery bonuses.

**Files to edit:**
- `prisma/schema.prisma` — add `CharacterHousing` model linking character to a building with rent due date
- `apps/api/src/modules/characters/` — `POST /characters/:id/rent` and `GET /characters/:id/housing`
- `apps/api/src/modules/simulation/simulation.service.ts` — collect rent each tick, apply passive bonuses

### Faction Wars
Factions actively compete for district control each tick based on influence and world events.

**Files to edit:**
- `apps/api/src/modules/simulation/simulation.service.ts` — add `advanceFactionWars()` step: factions with high influence in adjacent districts bid for control; winner updates `district.controllingFactionId`
- `apps/web/src/app/travel/page.tsx` — show controlling faction and its alignment on each district

### Replayable Ticks
Persist random seeds per tick and expose replay tooling for balance testing.

**Files to edit:**
- `apps/api/src/modules/simulation/simulation.service.ts` — generate and store a `randomSeed` per tick in `SimulationHistory`
- `prisma/schema.prisma` — add `seed` field to `SimulationHistory`
- `packages/game-rules/src/` — all outcome functions already accept optional `randomSeed`; wire them through
- `apps/admin/` — add a "Replay tick" button that re-runs a historical tick with the same seed

---

## Future Ideas

These are good long-term directions but not scoped for near-term work.

### Combat System (PvE)
Turn-based or dice-roll combat integrated as a resolution mechanic inside certain gigs/jobs/quests (e.g. bounty hunting, assassination, corporate raid). Not a standalone mode — just an outcome type. (PvP duels — roadmap item 5 — are the first step here.)

### Crafting
Use raw materials and schematics to craft tools, weapons, and gear. Requires the equipment system (roadmap item 3) and MATERIAL item drops first.

### Ship Upgrades and Fleet Logistics
Cargo capacity, travel range, escort risk, and route planning once the travel system is more complex.

### Guilds / Player Factions
Player-run crews with shared treasuries, territory claims, and crew-vs-crew objectives. The natural follow-up to PvP v1.

### World-event effects engine
Apply `WorldEvent.effects` JSON mechanically (reward multipliers, risk modifiers, danger changes) instead of only counting "pressure". The admin UI already lets you author effects; the simulation should honor them.

### Chat / social layer
District-scoped or global chat, direct messages, and a "who's here" presence list per district.

### Worker Deployment Parity
Run the BullMQ worker (`apps/worker`) through Docker Compose for sharded background processing on multi-instance deploys. **Warning:** the worker's resolution logic has drifted from the live API (probability-based rather than d20) — reconcile before wiring it up.

---

## Shipped

- **Roadmap 4: Interactive decision events** (2026-07-15) — Waiting on a timer is no longer dead time. Timeline events can carry `choices` (`packages/game-rules/src/decisions.ts`): once the activity clock passes the event's minute, the player is prompted to make a call. Choices can cost credits (charged immediately), require a d20 stat check against effective stats, and apply effects — `rollBonus` shifts the final activity check (a doomed run can be rescued or a safe one sunk; natural 1/20 still absolute), `creditsBonus` pays extra on success, `wantedDelta`/`healthDelta` hit immediately, `note` narrates the result. `POST /opportunities/instances/:id/decide` validates timing (can't answer future events), affordability, and one-answer-per-event; logs `DECISION_MADE`. Resolve reports a `decisionSummary` (incl. `rescued`). Dashboard + opportunities board render a prominent "⚠ Decision needed" panel with choice buttons (cost/stat-check labels). Unanswered decisions default to neutral. Seeded choices on both gigs, the Courier Loop job, and the Pigeon95 Secret quest. Tests: 13 decision specs (game-rules).
- **Roadmap 3: Equipment system** (2026-07-15) — Items in the WEAPON/CLOTHING/TOOL/VEHICLE categories can be equipped into four slots (`ItemInstance.equippedSlot`, migration `20260715113000_equipment_slots`; one item per slot — equipping swaps the old one out). Equipped gear grants stat bonuses read from `<categoryData>.statBonuses` (legacy flat `<stat>Bonus` keys still honoured) via `packages/game-rules/src/equipment.ts`. **Effective stats (base + gear, capped at 20) now drive every requirement check and d20 roll** in accept/available/resolve. `POST /characters/:id/items/:itemInstanceId/equip|unequip`; `GET /characters/:id` returns an `equipment` view (items + bonuses). Equipped items can't be sold (shop guard). Inventory page has EQUIP/UNEQUIP buttons + EQUIPPED badge; dashboard shows active gear bonuses. Seed gear normalized to `statBonuses` (pistol +1 CMB, jacket +1 STR, hacking deck +2 HACK, smuggler toolkit +3 STH). Tests: 11 equipment specs (game-rules) + 6 equip/unequip specs (API).
- **Roadmap 2: Character progression — XP, levels, stat points** (2026-07-15) — Characters now have `xp`, `level`, and `unspentStatPoints` (migration `20260715110000_character_progression`). Every resolved gig/job/quest awards XP (`xpRewardForOpportunity`: DC × 6, quests ×1.6, jobs ×0.8, 35% on failure). The level curve is transparent — 100 XP per current level to advance (`packages/game-rules/src/progression.ts`, MAX_LEVEL 50). Each level-up grants +2 stat points and +5 max health/energy, logs a `LEVEL_UP` activity, and is celebrated in the resolve message. `POST /characters/:id/stats/allocate` spends points (validates ownership, pool size, and the 20-point stat cap; logs `STAT_TRAINED`); the dashboard Stats panel has queue-and-confirm training UI and the Operator panel shows a LVL badge + XP progress bar. `GET /characters/:id` now returns a `progression` block (xpIntoLevel / xpForNextLevel). New `LEVEL_MIN` requirement type gates content by level. Tests: 12 progression specs (game-rules) + 4 allocation specs (API).
- **Roadmap 1: Fix broken core mechanics** (2026-07-15) — The requirement context now includes the character's inventory (both definition and instance ids), so `ITEM_REQUIRED` requirements actually work, with a friendly failure message. The live resolver applies the previously-dropped failure consequences: `MODIFY_CREDITS` (clamped at 0), `MODIFY_FACTION_REPUTATION`, `MODIFY_CORPORATION_REPUTATION`, and `MODIFY_STAT` on energy. Energy now has a real gameplay role: accepting any gig/job/quest costs energy scaled by DC (`calculateOpportunityEnergyCost` in `packages/game-rules/src/activity-costs.ts`, 5–25 range) — too exhausted means you must rest first; the board shows a ⚡ cost badge and an EXHAUSTED button state. STAT_XP gains are capped at `STAT_CAP = 20` (`packages/game-rules/src/progression.ts`) so d20 checks stay meaningful. New tests: 4 in game-rules, 3 in API accept flow.
- **Stale test fix** — `opportunities.service.spec.ts` expected the pre-d20 default difficulty (1); the service defaults to DC 10. Suite green again (2026-07-15).
- **1. Realtime tick updates via SSE** — `GET /simulation/stream` now publishes `simulation.tick.completed` plus notable NPC activity as server-sent events. The player dashboard and opportunity board subscribe through `apps/web/src/lib/use-event-stream.ts`, so due completions arrive without the old 12-second polling loop.
- **2. Quest chains and prerequisite unlocks** — Opportunity availability now respects completed-quest history, `UNLOCK_QUEST` reward edges, one-off quest completion, and shared requirement checks. The seeded story line is now a 3-step chain (`Welcome to Antrolus` → `Something in the Cargo` → `Pigeon95 Secret`) with `questData.chainId`, step counts, and board-side progress/hint display.
- **3. Reputation perks, lockouts, and route penalties** — Shared requirement logic now supports maximum reputation lockouts (`RELATIONSHIP_MAX`, `FACTION_REPUTATION_MAX`, `CORPORATION_REPUTATION_MAX`), opportunity acceptance enforces those rules server-side, and travel quotes apply faction-control standing checks with hostile surcharges or outright district lockouts.
- **Admin CRUD — full coverage** — Opportunities, Locations (planets/districts/buildings), Factions, Corporations, World Events, and Item Definitions all expose `POST/PATCH/DELETE` with referential-integrity checks (e.g. you can't delete a planet that still has districts or characters on it). Admin pages live at `apps/admin/src/app/<entity>/page.tsx`, share the `AdminShell` chrome, and call typed SDK methods. All admin writes are gated by an `AdminGuard` (`apps/api/src/modules/auth/admin.guard.ts`) — set `ADMIN_TOKEN` in `.env` and enter the same value in the admin header to authorise. Leaving `ADMIN_TOKEN` blank disables the gate for local dev.
- **Multi-step character creation** — Backstory archetypes (Ex-Soldier, Smuggler, Corporate Drone, Street Hacker, Drifter) with stat bonuses + free 12-point allocation + motivation prompt. Pure logic in `packages/game-rules/src/character-creation.ts` with 12 unit tests.
- **Single active activity** — Players can only work one gig/job/quest at a time; UI shows "BUSY" on accept buttons. 8 unit tests covering accept paths.
- **Jobs vs Gigs** — JOB-kind opportunities require a hire step (`POST /jobs/:opportunityId/hire`) and produce a `JobEmployment` row. Each shift is a normal accept→resolve. The world-tick scheduler issues strikes for missed shifts (default 24h cadence) with a credit penalty; 3 strikes = FIRED. Pure tick logic in `packages/game-rules/src/jobs.ts` with 6 tests.
- **Stock market visibility** — `StockPriceHistory` records per-tick prices; `/stocks/market` returns delta + percent change + 24-point sparkline. Player market page renders tiny SVG sparklines and ▲/▼ deltas. Deterministic random-walk price function in `packages/game-rules/src/stock-prices.ts` (6 tests).
- Player web app (dashboard, opportunities, inventory, shop, travel, stock market, activity log)
- JWT authentication — register/login/me, browser session with localStorage
- Admin panel — Next.js control plane at `localhost:3002`
- Auto-tick scheduler — in-process 30s world tick, configurable via env
- Travel costs — inter-planet credit costs, danger-based wanted-level risk, energy drain, travel quote preview
- Shops and black markets — buildings stock items; black markets give contraband sell premium
- Contraband loops (v1) — buying contraband in high-law districts raises heat
- Stock market — per-corporation prices moving each tick; player portfolios with avg-cost basis and unrealized P/L
- Safehouse / clinic / hub rest — energy + health recovery; safehouses reduce wanted level
- Consumable items — use medical patches and other consumables from inventory
- NPC simulation — NPCs accept opportunities, build relationships, push corp/faction state forward each tick
- Richer economy simulation — planetary economy drift, world-event pressure, demand/risk/travel indices
- Corporation boom/bust cycles — cash, debt, revenue, bankruptcy risk evolve each tick
- Dynamic district control — faction influence drives district control score and travel surcharges
- Simulation observability — admin dashboard with tick history and step-by-step summaries
