# Heliora — Development Plan

This file tracks planned work, active design decisions, and future ideas. Each item includes the files you'll need to touch so you can jump straight in.

---

## Up Next

### 1. Admin CRUD — Remaining Entities
Opportunities CRUD shipped. Locations, Factions, Corporations, World Events, and Item Definitions still need create/update/delete endpoints + admin forms.

**Files to edit (per entity):**
- `apps/api/src/modules/locations/locations.controller.ts` + `locations.service.ts` — add POST/PATCH/DELETE for planets, districts, buildings
- `apps/api/src/modules/factions/factions.controller.ts` + `factions.service.ts`
- `apps/api/src/modules/corporations/corporations.controller.ts` + `corporations.service.ts`
- `apps/api/src/modules/world-events/world-events.controller.ts`
- `apps/api/src/modules/items/items.controller.ts` + `items.service.ts`
- `apps/admin/src/app/[entity]/page.tsx` — follow the pattern in `apps/admin/src/app/opportunities/page.tsx`
- `packages/platform-sdk/src/index.ts` — add SDK methods for each new endpoint
- **Security note:** the opportunities CRUD endpoints currently have no auth check. Add an `AdminGuard` or shared admin token before exposing these to non-localhost deployments.

---

### 2. WebSockets / SSE — Push Updates
Replace browser polling with server-sent events or WebSockets so opportunity completions and world-tick results arrive instantly.

**Files to edit:**
- `apps/api/src/` — add `@nestjs/platform-socket.io` or use NestJS `EventEmitter` + SSE `@Sse()` endpoints
- `apps/api/src/modules/simulation/simulation.service.ts` — emit events after each tick step
- `apps/web/src/lib/` — add `useEventStream(url)` hook consuming `EventSource`
- `apps/web/src/app/page.tsx` (dashboard) and `apps/web/src/app/opportunities/page.tsx` — replace `useAutoRefresh` polling with the SSE hook

---

### 3. Quest Chains
Multi-step quests with prerequisites, branching outcomes, and story text.

**Files to edit:**
- `prisma/schema.prisma` — add `parentOpportunityId` or a `QuestChain` model with ordered steps
- `apps/api/src/modules/opportunities/opportunities.service.ts` — unlock next step on resolution
- `apps/web/src/app/opportunities/page.tsx` — show quest chain progress

---

### 4. Reputation Perks and Lockouts
High faction/corp reputation unlocks vendors, routes, and missions. Low standing triggers lockouts and travel surcharges.

**Files to edit:**
- `packages/game-rules/src/` — `checkRequirement()` already handles `RELATIONSHIP_MIN`; extend to `RELATIONSHIP_MAX` lockouts
- `apps/api/src/modules/characters/characters.service.ts` `travel()` — check faction control of destination district and apply surcharge or block
- `apps/web/src/app/travel/page.tsx` — show reputation-based warnings in the travel quote panel

---

### 5. Player Housing
Rent a safehouse for persistent item storage and passive energy/wanted-level recovery bonuses.

**Files to edit:**
- `prisma/schema.prisma` — add `CharacterHousing` model linking character to a building with rent due date
- `apps/api/src/modules/characters/` — `POST /characters/:id/rent` and `GET /characters/:id/housing`
- `apps/api/src/modules/simulation/simulation.service.ts` — collect rent each tick, apply passive bonuses

---

### 6. Faction Wars
Factions actively compete for district control each tick based on influence and world events.

**Files to edit:**
- `apps/api/src/modules/simulation/simulation.service.ts` — add `advanceFactionWars()` step: factions with high influence in adjacent districts bid for control; winner updates `district.controllingFactionId`
- `apps/web/src/app/travel/page.tsx` — show controlling faction and its alignment on each district

---

### 7. Replayable Ticks
Persist random seeds per tick and expose replay tooling for balance testing.

**Files to edit:**
- `apps/api/src/modules/simulation/simulation.service.ts` — generate and store a `randomSeed` per tick in `SimulationHistory`
- `prisma/schema.prisma` — add `seed` field to `SimulationHistory`
- `packages/game-rules/src/` — all outcome functions already accept optional `randomSeed`; wire them through
- `apps/admin/` — add a "Replay tick" button that re-runs a historical tick with the same seed

---

## Future Ideas

These are good long-term directions but not scoped for near-term work.

### Combat System
Turn-based or dice-roll combat integrated as a resolution mechanic inside certain gigs/jobs/quests (e.g. bounty hunting, assassination, corporate raid). Not a standalone mode — just an outcome type.

### Crafting
Use raw materials and schematics to craft tools, weapons, and gear. Requires an inventory-slot system and material item types first.

### Ship Upgrades and Fleet Logistics
Cargo capacity, travel range, escort risk, and route planning once the travel system is more complex.

### Character Progression Trees
Skills, specializations, and perks that unlock as characters complete more activities.

### Worker Deployment Parity
Run the BullMQ worker (`apps/worker`) through Docker Compose for sharded background processing on multi-instance deploys.

---

## Shipped

- **Multi-step character creation** — Backstory archetypes (Ex-Soldier, Smuggler, Corporate Drone, Street Hacker, Drifter) with stat bonuses + free 12-point allocation + motivation prompt. Pure logic in `packages/game-rules/src/character-creation.ts` with 12 unit tests.
- **Single active activity** — Players can only work one gig/job/quest at a time; UI shows "BUSY" on accept buttons. 8 unit tests covering accept paths.
- **Jobs vs Gigs** — JOB-kind opportunities require a hire step (`POST /jobs/:opportunityId/hire`) and produce a `JobEmployment` row. Each shift is a normal accept→resolve. The world-tick scheduler issues strikes for missed shifts (default 24h cadence) with a credit penalty; 3 strikes = FIRED. Pure tick logic in `packages/game-rules/src/jobs.ts` with 6 tests.
- **Stock market visibility** — `StockPriceHistory` records per-tick prices; `/stocks/market` returns delta + percent change + 24-point sparkline. Player market page renders tiny SVG sparklines and ▲/▼ deltas. Deterministic random-walk price function in `packages/game-rules/src/stock-prices.ts` (6 tests).
- **Admin CRUD for opportunities** — `apps/admin/src/app/opportunities/page.tsx` provides create/edit/delete with JSON editors for requirements, rewards, risks, repeatability. `POST/PATCH/DELETE /opportunities/:id` on the API.
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
