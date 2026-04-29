# Heliora — Hibaro-5

> A browser-based, API-first sci-fi idle RPG set in the corporate-controlled solar system **Hibaro-5**.

## What is Heliora?

Heliora is a fully playable sci-fi idle RPG where you control a character navigating the dark, corporate-controlled solar system of Hibaro-5. Take gigs, jobs, and quests; travel between planets; rest in safehouses; trade gear at shops and contraband on the black market; speculate on corporate stock; and watch the world tick around you while factions, corporations, and rival operators reshape the economy.

The game runs as a **browser game** at http://localhost:3001 once the API and web app are up. The world advances on a server-side auto-tick every 30 seconds, so opportunities you accept resolve themselves while you're away — true idle progression.

## How to Play

1. Start everything (see Local Setup below) and open http://localhost:3001.
2. Log in as `test_player` / `Heliora123`, or register a new operator.
3. The dashboard shows your character — credits, health, energy, wanted level, location, and any opportunities currently in progress.
4. Click **OPPORTUNITIES** in the nav to accept gigs, jobs, and quests. They run on a real timer; the world auto-ticks every 30s and resolves anything that's due. You can also resolve them manually the moment they're ready.
5. **TRAVEL** lets you move between planets, districts, and buildings. Higher danger / lower law = higher cost, more wanted-level risk, and a bigger energy hit.
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
POST /characters/:id/travel/quote            # Preview travel cost / risk (JWT required)
POST /characters/:id/rest                    # Recover at a safehouse / clinic / hub (JWT required)
POST /characters/:id/items/:itemId/use       # Consume a consumable item (JWT required)
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
GET /locations/solar-systems   # All solar systems
GET /locations/planets         # All planets
GET /locations/planets/:id     # Planet with districts
GET /locations/districts/:id   # District with buildings
GET /locations/buildings/:id   # Building details
```

### Factions & Corporations
```
GET /factions                  # All factions
GET /factions/:id              # Faction details
GET /corporations              # All corporations
GET /corporations/:id          # Corporation details
```

### Items
```
GET /items/definitions         # All item definitions
GET /items/definitions/:id     # Item definition by ID
```

### Opportunities
```
GET  /opportunities                          # All opportunity definitions
GET  /opportunities/available/:characterId   # Available for your character (JWT required)
GET  /opportunities/instances/:characterId   # Your accepted opportunities (JWT required)
POST /opportunities/:opportunityId/accept    # Accept opportunity for your character (JWT required)
  Body: { "characterId": "..." }
POST /opportunities/instances/:instanceId/resolve  # Manually resolve your instance (JWT required)
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
GET /world-events              # All world events
GET /world-events/active       # Currently active events
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
- Admin control plane with tick observability
