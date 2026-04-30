# Heliora — Hibaro-5 Backend

> A production-quality backend for a browser-based, API-first sci-fi idle RPG set in the corporate-controlled solar system **Hibaro-5**.

## What is Heliora?

Heliora is a sci-fi idle RPG where players control a character navigating the dark, corporate-controlled solar system of Hibaro-5. The game combines idle progression, faction reputation, corporations, gigs, jobs, quests, world events, economy simulation, travel, and character progression.

Players accept opportunities (gigs, jobs, quests), wait for them to complete (idle), and watch as their character's credits, stats, and relationships evolve. Factions compete, corporations scheme, and world events reshape the economic landscape.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | NestJS (TypeScript) |
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
│   └── worker/            # BullMQ background worker
├── packages/
│   ├── game-rules/        # Pure game logic (no NestJS dependencies)
│   ├── game-types/        # Shared TypeScript types
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

# 4. Run database migrations
npm run prisma:migrate

# 5. Seed the world
npm run db:seed

# 6. Start the API
npm run dev

# API is now running at http://localhost:3000
# Swagger docs at http://localhost:3000/api/docs
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://heliora:heliora@localhost:5432/heliora` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `PORT` | `3000` | API server port |
| `NODE_ENV` | `development` | Environment mode |

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
- Character: **Nova Rook**
- Starting location: Antrolus / Arrival Yard / Arrival Processing Hub
- Starting credits: 250

## API Routes

### Health
```
GET /health
```

### Players
```
GET /players/:id              # Get player with character
GET /players/:id/activity     # Get activity log (paginated)
```

### Characters
```
GET  /characters/:id           # Get character details
GET  /characters/:id/summary   # Character + memberships + activity
GET  /characters/:id/location  # Current location (planet/district/building)
GET  /characters/:id/inventory # All items owned by character
GET  /characters/:id/relationships  # Faction/corp reputation etc.
POST /characters/:id/travel    # Move to new location
  Body: { "planetId": "...", "districtId": "...", "buildingId": "..." }
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
GET  /opportunities/available/:characterId   # Available for character
GET  /opportunities/instances/:characterId   # Character's accepted opportunities
POST /opportunities/:opportunityId/accept    # Accept opportunity
  Body: { "characterId": "..." }
POST /opportunities/instances/:instanceId/resolve  # Manually resolve (dev)
```

### Simulation
```
POST /simulation/tick          # Resolve all due opportunities + world events
GET  /simulation/world-state   # Snapshot of planets/factions/corps/events
```

### World Events
```
GET /world-events              # All world events
GET /world-events/active       # Currently active events
```

## Example Gameplay Flow

Here's a complete gameplay loop using curl:

### 1. Get the test character

```bash
# Get player first
curl http://localhost:3000/players/test_player
# Note the character ID from the response

# Or get character directly (use ID from seed output)
curl http://localhost:3000/characters/<CHARACTER_ID>
```

### 2. View available opportunities

```bash
curl http://localhost:3000/opportunities/available/<CHARACTER_ID>
```

### 3. Accept a gig

```bash
# Accept "Move the Medical Crates" (needs stealth >= 5)
curl -X POST http://localhost:3000/opportunities/opp-move-medical-crates/accept \
  -H "Content-Type: application/json" \
  -d '{"characterId": "<CHARACTER_ID>"}'

# Note the instance ID from the response
```

### 4. Run simulation tick (resolve completed opportunities)

```bash
curl -X POST http://localhost:3000/simulation/tick
```

### 5. View updated character

```bash
curl http://localhost:3000/characters/<CHARACTER_ID>
# Check credits, wantedLevel, etc.
```

### 6. View activity log

```bash
curl http://localhost:3000/players/<PLAYER_ID>/activity
```

### 7. Check world state

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

### BullMQ for Background Processing
When an opportunity is accepted, a delayed BullMQ job is created to resolve it at `completesAt`. The worker processes these jobs, applying rewards/risks and writing activity logs.

For development/testing, the `/simulation/tick` endpoint manually resolves all due opportunities without Redis.

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

## Future Roadmap

- [ ] **Authentication** — JWT auth, player registration/login
- [ ] **Admin panel** — Next.js admin UI at `/apps/admin`
- [ ] **WebSockets** — Real-time notifications when opportunities complete
- [ ] **Richer economy simulation** — Price fluctuations, supply/demand
- [ ] **Stock market** — Corporation stocks affected by world events
- [ ] **NPC simulation** — NPCs accept opportunities, build relationships
- [ ] **Quest chains** — Multi-step quests with branching outcomes
- [ ] **Travel costs** — Credit cost for inter-planet travel
- [ ] **Faction wars** — Factions compete for district control
- [ ] **Corporation bankruptcy/boom cycles** — Economy simulation
- [ ] **Combat system** — Turn-based combat for bounty/assassination gigs
- [ ] **Crafting** — Use materials to craft items
- [ ] **Character progression trees** — Skills and specializations
