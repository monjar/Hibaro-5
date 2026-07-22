# Heliora — Hibaro-5

> A browser-based, API-first sci-fi idle RPG set in the corporate-controlled solar system **Hibaro-5**.

## What is Heliora?

Heliora is a fully playable sci-fi idle RPG where you control a character navigating the dark, corporate-controlled solar system of Hibaro-5. Take gigs, jobs, and quests; travel between planets; rest in safehouses; trade gear at shops and contraband on the black market; speculate on corporate stock; and watch the world tick around you while factions, corporations, and rival operators reshape the economy.

The game runs as a **browser game** at http://localhost:3001 once the API and web app are up. The world advances on a server-side auto-tick every 30 seconds, so opportunities you accept resolve themselves while you're away — true idle progression. The dashboard and opportunity board now subscribe to a live SSE stream, so tick completions and NPC-world changes show up without waiting for browser polling.

## How to Play

1. Start everything (see Local Setup below) and open http://localhost:3001.
2. Log in as `test_player` / `Heliora123`, or register a new operator.
3. The dashboard shows your character — credits, health, energy, wanted level, location, and any opportunities currently in progress.
4. Click **OPPORTUNITIES** in the nav to accept gigs, jobs, and quest-chain steps. Story quests can unlock follow-up quests, and one-off quest steps disappear once completed.
5. **TRAVEL** lets you move between planets, districts, and buildings. Higher danger / lower law = higher cost, more wanted-level risk, and a bigger energy hit. District-controlling factions now also apply reputation-based warnings, hostile surcharges, or hard lockouts.
6. **SHOP** trades gear with whichever building you're currently inside. Black markets pay a contraband bonus on sales but bringing contraband into a high-law district may raise your wanted level.
7. **MARKET** is the corporate stock exchange — buy and sell shares; prices swing every world tick based on revenue, debt, world events, and bankruptcy risk.
8. **INVENTORY** shows what you're carrying and lets you use consumables (e.g. medical patches restore health).
9. **LOGS** is the audit trail of everything you've done.
10. While inside a safehouse, clinic, or hub you can **REST** from the dashboard to recover health/energy and reduce heat (safehouses only).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | NestJS (TypeScript) |
| Player Web App | Next.js 15 + Tailwind |
| Admin Control Plane | Next.js 15 |
| Database | PostgreSQL 16 |
| ORM | Prisma 5 |
| Queue | BullMQ + Redis 7 |
| Validation | Zod + NestJS ValidationPipe |
| API Docs | Swagger/OpenAPI |
| Testing | Jest |
| Linting | ESLint + Prettier |
| Local Infrastructure | Docker Compose |

## Repository Structure

```
hibaro-5/
├── apps/
│   ├── api/               # NestJS REST API
│   │   └── src/
│   │       ├── modules/   # Feature modules (players, characters, etc.)
│   │       └── prisma/    # Prisma service
│   ├── admin/             # Next.js admin control plane
│   └── worker/            # BullMQ background worker
├── packages/
│   ├── game-rules/        # Pure game logic (no NestJS dependencies)
│   ├── game-types/        # Shared TypeScript types
│   ├── platform-sdk/      # Shared API client + realtime contracts
│   └── validation/        # Zod schemas
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
├── docker-compose.yml     # Postgres + Redis
└── README.md
```

## Local Setup

### Prerequisites
- Node.js 20+
- Docker + Docker Compose
- npm 9+

### One-command Setup + Run

```bash
npm run setup:run
npm run setup:stop
```

That script will:
- install dependencies when needed
- create `.env` from `.env.example` if missing
- start Postgres and Redis with Docker Compose
- wait for both services to accept connections
- run Prisma migrations and seed data
- launch the API, player web app, admin app, and worker together

Optional flags:

```bash
./scripts/setup-and-run.sh --help
./scripts/setup-and-run.sh --no-worker
./scripts/setup-and-run.sh --force-install
./scripts/setup-and-run.sh --sudo-docker
./scripts/stop-and-clean.sh --help
./scripts/stop-and-clean.sh --docker
./scripts/stop-and-clean.sh --sudo-docker
```

If a previous run left ports `3000`, `3001`, or `3002` occupied, stop the stale processes first:

```bash
npm run setup:stop
npm run setup:stop -- --docker --sudo-docker
```

### Step-by-step Setup

```bash
# 1. Clone and install dependencies
git clone https://github.com/monjar/Hibaro-5.git
cd Hibaro-5
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env if needed (defaults work with docker-compose)

# 3. Start Postgres and Redis
docker compose up -d

# 4. Run database migrations (creates tables + applies any new migrations)
npm run prisma:migrate

# 5. Seed the world (idempotent – safe to re-run after pulling new migrations)
npm run db:seed

# 6. Start the API
npm run dev

# 7. Start the player web app
npm run dev:web

# 8. Start the admin control plane
npm run dev:admin

# API is now running at http://localhost:3000
# Player web app at http://localhost:3001
# Admin control plane at http://localhost:3002
# Swagger docs at http://localhost:3000/api/docs
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://heliora:heliora@localhost:5432/heliora` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `PORT` | `3000` | API server port |
| `NODE_ENV` | `development` | Environment mode |
| `JWT_SECRET` | `dev-secret` | Required — JWT signing key |
| `JWT_EXPIRES_IN` | `1d` | JWT validity duration |
| `ADMIN_TOKEN` | _(unset)_ | Shared secret for admin CRUD endpoints. When unset, admin writes are open (local dev). Set to any string to gate POST/PATCH/DELETE on opportunities, locations, factions, corporations, world events, and item definitions. |
| `SIMULATION_AUTO_TICK` | `true` | Set to `false` to disable the in-process world-tick scheduler |
| `SIMULATION_TICK_INTERVAL_MS` | `30000` | Auto-tick interval |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | API base URL the web/admin apps point at |

## Database Setup

The Prisma schema defines all entities. Key commands:

```bash
# Generate Prisma client (run after schema changes)
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed the database
npm run db:seed

# Open Prisma Studio (GUI)
npx prisma studio --schema=prisma/schema.prisma
```

## Seed Data

Running `npm run db:seed` creates:

### Solar System
- **Hibaro-5** — corporate-controlled solar system

### Planets
- **Antrolus** — industrial starting world
- **Teraluma** — prosperous civic world
- **Los Panko** — neon-lit port world  
- **Pigeon95** — logistics hub
- **Valerina** — remote blacksite world

### Factions
- **Red Market** — underground trading network
- **Coil Union** — labor union
- **Glasswater Civic Authority** — civic government
- **Valerina Ghosts** — shadowy collective

### Corporations
- **Pigeon Corporation** (LOGISTICS) — controls Pigeon95
- **Helix Dynamics** (ENERGY) — Antrolus & Teraluma presence
- **Blue Orchard Biotech** (MEDICAL) — Valerina secrets
- **SunSpoke Media** (MEDIA) — controls information

### Test Player
- Username: `test_player`
- Default password: `Heliora123` (override with `SEED_TEST_PLAYER_PASSWORD`)
- Character: **Nova Rook**
- Starting location: Antrolus / Arrival Yard / Arrival Processing Hub
- Starting credits: 250

### Story Quest Chain
- **Welcome to Antrolus** — onboarding quest that unlocks the next investigation step
- **Something in the Cargo** — Coil Union follow-up that opens the Pigeon95 trail
- **Pigeon95 Secret** — final investigation step, with corporation-standing lockout support

## API Routes

### Health
```
GET /health
```

### Authentication
```
POST /auth/register          # Register a player and starter character
POST /auth/login             # Log in with username/email + password
GET  /auth/me                # Authenticated player profile
```

### Players
```
GET /players/:id              # Get your player with character (JWT required)
GET /players/:id/activity     # Get your activity log (JWT required)
```

### Characters
```
GET  /characters/:id                         # Get your character details (JWT required)
GET  /characters/:id/summary                 # Your character + memberships + activity (JWT required)
GET  /characters/:id/location                # Your current location (JWT required)
GET  /characters/:id/inventory               # All items owned by your character (JWT required)
GET  /characters/:id/relationships           # Your faction/corp reputation etc. (JWT required)
POST /characters/:id/travel                  # Move your character to a new location (JWT required)
  Body: { "planetId": "...", "districtId": "...", "buildingId": "..." }
POST /characters/:id/travel/quote            # Preview travel cost / risk + faction-standing penalties (JWT required)
POST /characters/:id/rest                    # Recover at a safehouse / clinic / hub (JWT required)
POST /characters/:id/items/:itemId/use       # Consume a consumable item (JWT required)
```

### Simulation / Realtime
```
POST /simulation/tick                        # Run one simulation tick manually
GET  /simulation/world-state                # Snapshot of planets, districts, corps, events, etc.
GET  /simulation/history?limit=10           # Recent tick history
GET  /simulation/realtime-contracts         # Shared realtime event contract metadata
GET  /simulation/stream                     # Server-sent event stream for tick + NPC updates
```

### Shops
```
GET  /shops/:buildingId          # List items for sale at a shop building
POST /shops/:buildingId/buy      # Buy an item (must be inside building) (JWT required)
  Body: { "itemInstanceId": "...", "characterId": "..." }
POST /shops/:buildingId/sell     # Sell an owned item to a shop (JWT required)
  Body: { "itemInstanceId": "...", "characterId": "..." }
```

### Stock Market
```
GET  /stocks/market               # Public stock quotes for all listed corporations
GET  /stocks/holdings/:characterId  # Your portfolio (JWT required)
POST /stocks/buy                  # Buy shares (JWT required)
  Body: { "characterId": "...", "corporationId": "...", "shares": 5 }
POST /stocks/sell                 # Sell shares (JWT required)
  Body: { "characterId": "...", "corporationId": "...", "shares": 5 }
```

### Locations
```
GET    /locations/solar-systems   # All solar systems
GET    /locations/planets         # All planets
GET    /locations/planets/:id     # Planet with districts
GET    /locations/districts       # All districts (admin)
GET    /locations/districts/:id   # District with buildings
GET    /locations/buildings       # All buildings (admin)
GET    /locations/buildings/:id   # Building details
POST   /locations/planets         # Create a planet (admin)
PATCH  /locations/planets/:id     # Update a planet (admin)
DELETE /locations/planets/:id     # Delete a planet (admin)
POST   /locations/districts       # Create a district (admin)
PATCH  /locations/districts/:id   # Update a district (admin)
DELETE /locations/districts/:id   # Delete a district (admin)
POST   /locations/buildings       # Create a building (admin)
PATCH  /locations/buildings/:id   # Update a building (admin)
DELETE /locations/buildings/:id   # Delete a building (admin)
```

### Factions & Corporations
```
GET    /factions                  # All factions
GET    /factions/:id              # Faction details
POST   /factions                  # Create a faction (admin)
PATCH  /factions/:id              # Update a faction (admin)
DELETE /factions/:id              # Delete a faction (admin)
GET    /corporations              # All corporations
GET    /corporations/:id          # Corporation details
POST   /corporations              # Create a corporation (admin)
PATCH  /corporations/:id          # Update a corporation (admin)
DELETE /corporations/:id          # Delete a corporation (admin)
```

### Items
```
GET    /items/definitions         # All item definitions
GET    /items/definitions/:id     # Item definition by ID
POST   /items/definitions         # Create an item definition (admin)
PATCH  /items/definitions/:id     # Update an item definition (admin)
DELETE /items/definitions/:id     # Delete an item definition (admin)
```

### Opportunities
```
GET    /opportunities                          # All opportunity definitions
GET    /opportunities/available/:characterId   # Available for your character (JWT required)
GET    /opportunities/instances/:characterId   # Your accepted opportunities (JWT required)
POST   /opportunities/:opportunityId/accept    # Accept opportunity for your character (JWT required)
  Body: { "characterId": "..." }
POST   /opportunities/instances/:instanceId/resolve  # Manually resolve your instance (JWT required)
POST   /opportunities                          # Create an opportunity definition (admin)
PATCH  /opportunities/:id                      # Update an opportunity definition (admin)
DELETE /opportunities/:id                      # Delete an opportunity definition (admin)
```

### Simulation
```
POST /simulation/tick          # Resolve all due opportunities + world events
GET  /simulation/world-state   # Snapshot of planets/factions/corps/events
GET  /simulation/history       # Recent step-based simulation tick history
GET  /simulation/realtime-contracts  # Shared realtime event contracts
```

### World Events
```
GET    /world-events              # All world events
GET    /world-events/active       # Currently active events
GET    /world-events/:id          # World event details
POST   /world-events              # Create a world event (admin)
PATCH  /world-events/:id          # Update a world event (admin)
DELETE /world-events/:id          # Delete a world event (admin)
```

## Example Gameplay Flow (Browser)

The fastest way to play is the web UI at http://localhost:3001:

1. Log in (`test_player` / `Heliora123`).
2. From **OPPORTUNITIES**, accept any gig you qualify for.
3. Wait — the auto-tick scheduler resolves due jobs every ~30s. The dashboard's "In Progress" panel shows the timer.
4. Hit **TRAVEL → Antrolus → Furnace Row → Furnace Row Underground** to enter the black market.
5. Open **SHOP** to buy a Smuggler Toolkit (boosts smuggling success); sell unwanted gear back here for credits.
6. Open **MARKET** and buy a few PGN (Pigeon Corporation) shares. Prices update on every world tick.
7. Travel back to the Arrival Yard and **REST** at the Red Market Safehouse to refill energy and shave off wanted level.
8. Repeat.

## Example Gameplay Flow (curl)

For headless testing — every authenticated route uses `Authorization: Bearer <token>`.

### 1. Log in and capture a token

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test_player","password":"Heliora123"}' | jq -r .accessToken)
CHAR_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/auth/me | jq -r .character.id)
```

### 2. Browse and accept an opportunity

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/opportunities/available/$CHAR_ID

curl -X POST http://localhost:3000/opportunities/opp-move-medical-crates/accept \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"characterId\":\"$CHAR_ID\"}"
```

### 3. Trade stocks

```bash
curl http://localhost:3000/stocks/market

curl -X POST http://localhost:3000/stocks/buy \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"characterId\":\"$CHAR_ID\",\"corporationId\":\"<corpId>\",\"shares\":3}"
```

### 4. Force a simulation tick (still useful for tests)

```bash
curl -X POST http://localhost:3000/simulation/tick
```

### 5. Inspect world state

```bash
curl http://localhost:3000/simulation/world-state
```

## Admin Control Plane

The Next.js admin app at http://localhost:3002 manages every CMS-style entity in the world:

- **Overview** (`/`) — tick history, market state, district control, NPC activity, realtime contracts.
- **Opportunities** (`/opportunities`) — gigs, jobs, quests with JSON editors for requirements, rewards, risks, and JOB cadence.
- **Locations** (`/locations`) — planets, districts, and buildings under one tabbed page.
- **Factions** (`/factions`) — name, ideology, treasury, influence, optional HQ building.
- **Corporations** (`/corporations`) — industry, status, cash/debt/revenue, stock ticker/price/volatility, bankruptcy risk.
- **World Events** (`/world-events`) — schedule events with scope, effects JSON, and timed activation.
- **Items** (`/items`) — item definitions with category-specific JSON for weapon/clothing/tool/vehicle data.

Every write goes through `AdminGuard`. To enable the gate, set `ADMIN_TOKEN=<your secret>` in `.env`, restart the API, and paste the same token into the **Admin token** widget at the top of any admin page (it's stored in `localStorage` and sent as `x-admin-token` on every write). With `ADMIN_TOKEN` left blank the admin panel is open — fine for local dev, never deploy that way.

Deletes refuse to cascade silently — for example you can't delete a planet that still has districts or characters on it, or a corporation with active stock holdings. Resolve those references first.

## Running Tests

```bash
# Run all tests (game-rules + API)
npm test

# Run game-rules tests only
npm run test --workspace=packages/game-rules

# Run API tests only  
npm run test --workspace=apps/api

# With coverage
npm run test:cov --workspace=packages/game-rules
```

## Architecture Notes

### Modular Monolith
The codebase is a modular monolith structured for easy extraction into microservices later. Each NestJS module is self-contained with its own controller, service, and module definition.

### PostgreSQL as Source of Truth
All game state lives in PostgreSQL. Redis is used only for queues and future caching.

### Game Rules as Pure Functions
The `packages/game-rules` package contains all game logic as pure TypeScript functions with no NestJS or database dependencies. This makes them:
- Fully testable in isolation
- Portable to other contexts (admin tools, simulations)
- Deterministic when given a `randomSeed`

Key functions:
- `checkRequirement(character, requirement, context)` — validates a single requirement
- `checkRequirements(character, requirements, context)` — validates all requirements
- `calculateOpportunitySuccessChance(character, opportunity)` — stat-based success probability
- `rollOpportunityOutcome(character, opportunity, randomSeed?)` — roll success/fail + rewards/risks
- `resolveOpportunity(character, opportunity, randomSeed?)` — full resolution with character updates

### Background Processing
The API has an in-process **auto-tick scheduler** (see `apps/api/src/modules/simulation/simulation.scheduler.ts`) that runs the full world tick every 30 seconds — resolving due opportunities, advancing the economy, repricing stocks, expiring/activating world events, and recording NPC actions. Tick interval is configurable via `SIMULATION_TICK_INTERVAL_MS`; auto-tick can be disabled with `SIMULATION_AUTO_TICK=false`.

The `/simulation/tick` endpoint still manually triggers a tick on demand (useful for tests).

A BullMQ + Redis path exists in `apps/worker` and can be used for sharded background processing — currently the in-process scheduler is sufficient for single-instance deployments.

### Thin Controllers
Controllers only handle HTTP concerns (routing, request parsing, response serialization). All business logic lives in services. Game rules stay in the `packages/game-rules` package.

## Running the Worker

```bash
# Start the worker separately
cd apps/worker
npm install
npm run dev

# Or with Docker (TODO: add worker to docker-compose)
```

## Documentation

- **[docs/PROJECT-STATE.md](docs/PROJECT-STATE.md)** — the factual inventory: architecture, every shipped system, content counts, verification state, and known gaps.
- **[docs/GAME-ASSESSMENT.md](docs/GAME-ASSESSMENT.md)** — the qualitative assessment: how the game plays hour-by-hour, loop and balance analysis, a scorecard, and the launch-readiness verdict.
- **[PLAN.md](PLAN.md)** — the development plan: future ideas plus detailed shipping notes for every completed feature.

The README below covers setup and the API surface; the feature set has grown well beyond the highlights listed here — PROJECT-STATE.md is the authoritative systems list (progression/levels, equipment, mid-mission decisions, PVP, housing, crafting, faction wars, world-event effects, daily rewards, achievements, and more).

## Roadmap

See [PLAN.md](PLAN.md) for the full development plan — what's up next, what's in progress, and future ideas — with file-level context for each item.

### Shipped highlights
- Player web app (dashboard, opportunities, inventory, travel, shop, stock market, activity log)
- JWT auth — register/login/me, browser session with localStorage
- Auto-tick scheduler — 30s in-process world tick, configurable via env
- Travel costs and quote preview
- Shops and black markets — contraband premium, heat mechanic
- Stock market — per-corp prices move each tick; player portfolios with avg-cost basis and P/L
- Safehouse / clinic / hub rest — health, energy, wanted-level recovery
- Consumable items — use from inventory
- NPC simulation, economy drift, corporation boom/bust, faction district control
- Admin control plane with tick observability **and full CRUD** for opportunities, planets/districts/buildings, factions, corporations, world events, and item definitions — all gated behind an `ADMIN_TOKEN`
