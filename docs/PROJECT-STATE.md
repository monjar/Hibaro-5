# Heliora / Hibaro-5 — Project State

_Last updated: 2026-07-15 (branch `claude/game-publishing-readiness-10b6ra`, 14 feature commits on top of `master`)._

This document is the factual inventory: what exists, where it lives, and how it's verified. For the qualitative judgement of the game — how it plays, what's strong, what's weak — see [GAME-ASSESSMENT.md](GAME-ASSESSMENT.md). For the roadmap and per-feature shipping notes, see [PLAN.md](../PLAN.md).

---

## 1. What the game is

Heliora is a browser-based, API-first sci-fi idle RPG. Players run an operator in the corporate solar system Hibaro-5: taking gigs, jobs, and story quests; making mid-mission decisions; travelling between five planets; trading gear, contraband, and corporate stock; renting safehouses; crafting; and fighting other players — while a server-side world tick (default every 30 s) advances an economy of NPCs, corporations, factions, and world events around them.

## 2. Architecture

| Layer | Technology | Location |
|---|---|---|
| REST API | NestJS (TypeScript) | `apps/api` — 15 feature modules, 106 routes |
| Player web app | Next.js 15 + Tailwind | `apps/web` — 10 pages |
| Admin control plane | Next.js 15 | `apps/admin` — full CMS + simulation observability |
| Pure game logic | dependency-free TypeScript | `packages/game-rules` — 20 modules, all unit-tested |
| Shared API client + types | TypeScript | `packages/platform-sdk` |
| Database | PostgreSQL 16 + Prisma 5 | `prisma/schema.prisma`, 18 migrations |
| Realtime | Server-sent events | `GET /simulation/stream`, auto-reconnect client |
| Background | In-process tick scheduler | `apps/api/src/modules/simulation/simulation.scheduler.ts` |

Design invariants that have held throughout:

- **PostgreSQL is the only source of truth.** Redis exists for future queueing only.
- **All game math lives in `packages/game-rules`** as pure, deterministic-when-seeded functions. The API layer orchestrates I/O; the rules package decides outcomes. Every rules module has a spec.
- **Thin controllers.** HTTP concerns only; business logic in services; game math in game-rules.
- **Idempotent seeds.** `npm run db:seed` upserts everything (`prisma/seed.ts` + `prisma/seed-expansion.ts`) and is safe to re-run after pulling migrations.

## 3. Systems inventory (all shipped and verified)

### Core loop
- **Opportunities** — gigs (one-shot), jobs (hire → repeatable shifts with strike/firing discipline), quests (story steps with chain unlocks, one-off completion, hints). Accept pre-rolls a d20 outcome; a timer runs; resolve applies rewards/risks. Requirement engine supports stat/credits/level minimums, reputation min/max lockouts, item possession, quest completion, and **location gating** (`PLANET_ACCESS`/`DISTRICT_ACCESS` — the board only shows work for the planet you're on).
- **Interactive decision events** — timeline events can carry choices (credit costs, stat checks); answering mid-activity shifts the final check (`rollBonus` can rescue a failing run or sink a safe one; natural 1/20 absolute), pays bonus credits, or bites immediately (wanted/health). Unanswered decisions default to neutral.
- **Energy economy** — accepting work costs energy scaled by DC (5–25); energy decays 3/hour (suspended while resting or housed); recovered by rest (safehouse/clinic/hub, per-minute billing, interruptible) and consumables.

### Character
- **Creation** — 3-step wizard: credentials → backstory archetype (5 options with stat bonuses + starting credits) → 12-point stat allocation across 8 stats.
- **Progression** — XP from every activity (DC × 6; quests ×1.6, jobs ×0.8; 35 % on failure) plus daily drops, achievements, and crafting. Transparent curve (100 XP × current level to advance, max 50). Level-ups grant +2 stat points (spend via dashboard, capped at 20 per stat) and +5 max health/energy. `LEVEL_MIN` gates content.
- **Equipment** — four slots (weapon/outfit/tool/vehicle); gear grants stat bonuses that feed **every** requirement check and d20 roll (opportunities, decisions, PVP, crafting). Equipped items can't be sold or stored.

### World
- **Travel** — credit cost, danger-based risk, energy drain, wanted-level exposure; faction-standing surcharges and hard lockouts; world-event danger modifiers; quote preview before committing; SVG sector map + isometric district map.
- **Faction wars** — districts are contested each tick (influence share × local building assets × jitter, 1.35× hysteresis); control flips persist, feed travel penalties, and stream into the World Feed.
- **World-event effects engine** — authored `effects` JSON applies mechanically: reward multipliers, risk shifts, danger changes, economy drift, and `SPAWN_EVENT` chains.
- **Economy simulation** — planetary economy drift, corporation boom/bust (revenue/debt/cash/bankruptcy), seeded stock repricing per tick, NPC actors nudging faction/corp aggregates.
- **Replayable ticks** — every tick stores a random seed and exact pricing inputs; admin replay endpoint verifies deterministic reproduction.

### Economy & items
- **Shops & black markets** — per-building stock with pricing modifiers; contraband premium at black markets; buying contraband in high-law districts raises heat.
- **Stock market** — per-corp prices move each tick; portfolios with average-cost basis, unrealized P/L, sparklines; brokerage fee.
- **Crafting v1** — five recipes (materials + credits + energy → gear/consumables) at any warehouse or your rented safehouse; stat-gated against effective stats; awards XP.
- **Housing** — rent the safehouse you're standing in (district-priced daily rent); no passive energy decay while housed; wanted −1 per paid rent day; item storage at the safehouse; daily rent collection with eviction (stored items returned).

### Multiplayer & retention
- **PVP v1** — same-district duels (combat+agility d20 contest with gear, 10–500 credit wagers, cooldowns, high-law heat, never lethal); player bounties (escrowed, hunted in the target's district, contest vs stealth+agility); rookie protection below level 3; public leaderboard (level, credits, duel W/L, bounties).
- **Retention** — daily supply drop (streak-scaled 75→225 credits + XP, 48 h grace); 12 server-verified achievements with progress bars and claimable rewards.
- **Realtime engagement** — SSE stream with auto-reconnect/backoff; dashboard World Feed (NPC actions, rival arrivals, faction control flips); live decision prompts; shift-due warnings.

### Operations
- **Admin control plane** — full CRUD (opportunities, locations incl. isometric map editor, factions, corporations, world events, items, players) behind `AdminGuard` (admin-flagged player JWT or `ADMIN_TOKEN` header); tick history with step summaries and per-tick REPLAY verification.
- **Auth** — JWT register/login/me; ownership checks on every player-facing route; admin flag on players.

## 4. Content inventory (seeded)

| Content | Count | Notes |
|---|---|---|
| Planets | 5 | All populated — every planet has a hub, shop, mission board, and rest/clinic options |
| Districts | 10 | 2 per planet, each with danger/law/economy profiles |
| Buildings | 37 | incl. 3 black markets, 5 safehouses, 5 clinics, corp HQs |
| Item definitions | 26 | tiered gear with stat bonuses, consumables (incl. wanted-reduction), materials |
| Opportunities | 24 | 10 gigs, 7 jobs, 7 quests across 3 story chains (Antrolus onboarding → Pigeon95 conspiracy → Ghost Signal; plus Los Panko *Undertow*) |
| Decision points | 8 | across gigs, jobs, and quests |
| World events | 9 | incl. one spawn-chained follow-up |
| Crafting recipes | 5 | consume the seeded material economy |
| Achievements | 12 | server-verified progress |
| Factions / Corporations | 4 / 4 | all with buildings, reputation stakes, and stock listings (corps) |

## 5. Verification state

- **184 automated tests** across 21 suites — 147 in `packages/game-rules` (every rules module), 37 in `apps/api` (accept flow, travel restrictions, stat allocation, equip/unequip, admin CRUD).
- Web and admin apps typecheck clean (`tsc --noEmit`).
- Every feature was additionally **verified end-to-end against the live API** during development (documented per-feature in PLAN.md's Shipped section), including failure paths: eviction, duel cooldowns, bounty refunds, decision replays, deterministic tick replay, location lockouts.
- 18 Prisma migrations apply cleanly to a fresh database; seeds are idempotent.

## 6. Known gaps & operational notes

- **Repo push access**: the development branch exists locally / in the delivered git bundle; pushing requires write access for the GitHub App.
- **Production config**: set `JWT_SECRET` and `ADMIN_TOKEN`; no API rate limiting yet; SSE stream is a public broadcast (no per-user channels).
- **Client resilience**: several pages still swallow fetch errors silently (blank sections rather than error states); no global error boundary.
- **Mobile**: layouts reflow, but the isometric travel map and some fixed-width panels are not phone-tuned.
- **Worker parity**: `apps/worker` (BullMQ) is unused and its resolution logic predates the d20 system — reconcile before wiring up multi-instance processing.
- **Unimplemented reward/consequence types**: `STOCK_SHARES`, `RANK_UP`, `CHARACTER_RELATIONSHIP` rewards and `SPAWN_EVENT`/`ADD_ITEM`/`REMOVE_ITEM` risk consequences remain schema-supported but inert; `UNLOCK_BUILDING` is recorded but has no gating system behind it.
