# Heliora — Game Assessment

_Written 2026-07-15, after the publishing-readiness build-out (see [PROJECT-STATE.md](PROJECT-STATE.md) for the factual inventory). This is the qualitative judgement: how the game actually plays, where it's strong, where it's thin, and what stands between it and a public launch._

---

## 1. The player experience today

**First session (0–30 min).** Registration is genuinely good: backstory archetypes and point-buy stats create real identity before minute two. The player lands on Antrolus with 200–500 credits, a quest ("Welcome to Antrolus") pointing at the gig board, and a dashboard that explains itself. The first gig teaches the whole loop — energy cost on accept, a live-updating timeline, a mid-mission decision prompt ("Grease a palm / Take the crawlway / Wait them out"), and a d20 resolution with visible math (roll + stat modifier vs DC). The daily supply drop banner and first achievement ("First Blood Money") both pay out inside the first half hour. This opening is launch-quality.

**Early game (day 1–3).** The Antrolus onboarding chain funnels the player through jobs (hire → shifts → don't-miss-your-shift pressure), the black market, the stock exchange, and finally off-world to Pigeon95. Level 3 unlocks PVP — by then the player has seen most core systems. Location-gated content makes travel *the* discovery mechanic: each planet's board is invisible until you stand on it.

**Mid game (week 1–2).** The interlocking systems carry this phase and are the game's best quality: gear from shops boosts checks → better checks beat higher-DC content → higher content pays materials → materials craft gear; housing removes energy decay and enables crafting at home → longer sessions → rent as a standing credit sink; faction wars move district control → travel surcharges shift → yesterday's cheap route is today's hostile lockout. Duels and bounties give credits somewhere adversarial to go.

**Late game (week 3+).** This is where the floor shows. Once the three story chains are done (7 quests), stats plateau near the cap, and the leaderboard position stabilizes, the remaining loop is repeatable gigs/jobs, market speculation, and PVP against a thin population. There is no guild, no chat, no seasonal reset, no PvE boss-equivalent. Retention past ~3 weeks currently rests on the daily streak and the other players.

## 2. Loop analysis

| Loop | Cadence | State | Notes |
|---|---|---|---|
| Accept → decide → resolve | 10–90 min | **Strong** | Decision points fixed the dead-timer problem; checking back mid-mission matters. |
| Session (energy bar) | ~10 actions | **Strong** | Energy (5–25/accept, 3/h decay) plus rest costs create natural session boundaries — the idle-game heartbeat. Housing as the decay-remover is a well-priced upgrade. |
| Daily | 24 h | **Good** | Supply-drop streak (48 h grace), job shift cadence with strikes, rent day (wanted −1). Three independent reasons to return daily. |
| Weekly+ | 1–3 wk | **Thin** | Story chains exhaust; achievements are one-time; no season/prestige/guild layer. |

## 3. Balance & economy review

**Progression pacing** (100 XP × level to advance; DC 12 gig ≈ 72 XP): level 3 (PVP unlock) after ~6 successful gigs — comfortably day one; level 5 ≈ 14 gigs; level 10 ≈ 60 plus dailies/achievements — roughly two casual weeks. The curve is transparent and the pace fits an idle cadence. Failure paying 35 % XP keeps losses from feeling wasted.

**Credit flows.** Faucets: gigs (260–850), job shifts (180–260 on cadence), dailies (75–225), one-time achievements (~4,300 total), market gains, PVP winnings (zero-sum). Sinks: travel, rest billing, shops (60–1,150), crafting, rent (20–62/day), decision bribes, brokerage fees, failure credit-loss risks, wagers/escrow. The sink set is healthy and — importantly — most sinks are *chosen* (upgrades, bribes, leases), not punitive.

**Watch items** (not yet problems, but instrument them at launch):
1. **Stock market as a faucet.** Price drift is bounded (±25 %/tick, $1 floor) but not provably zero-EV; a disciplined player may extract steady credits. Track aggregate player P/L; add a capital-gains fee if it runs hot.
2. **Faction-war snowball.** Presence uses *relative* influence share, which stops runaway absolute values from mattering, but only two factions get NPC-pumped influence — over weeks they will dominate the map. Player-joinable factions (future) or influence decay would counterbalance.
3. **PVP alt-farming.** Wagers cap at 500 and transfers cap at carried credits, but leveling an alt to 3 (~6 gigs) and losing duels to a main is a viable credit pipe. Rookie protection helps; consider a transfer tax or same-IP guard before open registration.
4. **Stat cap convergence.** At 20-cap with gear, veteran checks against DC ≤ 14 approach auto-success. Higher-DC late content (DC 16–20) or scaling DCs will be needed within a month of live play.

## 4. Scorecard

| Dimension | Score | Rationale |
|---|---|---|
| Core loop feel | ★★★★☆ | Decisions + visible dice + energy pacing; resolve is satisfying. Missing celebration/animation polish. |
| Progression | ★★★★☆ | Clear curve, three advancement axes (level, stats, gear). No respec, no prestige. |
| World simulation | ★★★★☆ | Economy, factions, events, and NPCs genuinely move — and now mechanically matter. NPC cast is small (3). |
| Content volume | ★★★☆☆ | 24 activities, 3 chains, 5 planets — solid soft-launch, ~6–10 hours of fresh content; late game repeats. |
| Multiplayer | ★★★☆☆ | Real PVP with stakes and a leaderboard, but players can fight and never talk — no chat, guilds, or trading. |
| Retention scaffolding | ★★★★☆ | Streaks, achievements, shifts, rent — strong daily; weak monthly. |
| UI/UX | ★★★☆☆ | Distinctive, information-dense, self-explaining; but silent error states and a desktop-first travel map. |
| Ops readiness | ★★☆☆☆ | No rate limiting, public SSE broadcast, secrets discipline manual, no monitoring/backup story. |

## 5. Launch readiness verdict

**Ready now for:** a closed beta / friends-and-family soft launch of ~10–100 players. The game is complete, coherent, self-teaching, fun for its first two weeks, and every advertised system works and is tested.

**Before open public launch, in priority order:**
1. **Ops hardening** — rate limiting, real `JWT_SECRET`/`ADMIN_TOKEN`, DB backups, basic monitoring; per-user SSE channels or at least payload minimization.
2. **Abuse guards** — PVP transfer tax or account-age gate; registration throttling.
3. **Client resilience** — replace silent `catch {}` blanks with error states and retry; global error boundary.
4. **Social minimum** — district-scoped chat or even a per-district message wall; multiplayer without communication caps its own network effect.
5. **Mobile pass** — the travel map and fixed-width panels; most idle-game sessions happen on phones.
6. **Guided first-15-minutes** — convert the existing hint text into a 4-step checklist quest ("accept a gig → make a call → resolve → claim your drop").

**Post-launch content engine:** the admin CMS can author opportunities, events (now with real effects), items, and locations without deploys — content velocity is a solved problem. The next *systems* in line (per PLAN.md Future Ideas): PvE combat on the existing contest engine, guilds/crews, chat, and higher-DC endgame content.

## 6. Bottom line

Heliora has crossed the line from "polished prototype" to "small but genuine game." Its identity — an idle RPG where the waiting is interruptible by meaningful decisions, on top of a world simulation that visibly moves without you — is distinctive and delivered. The remaining distance to a public launch is operational and social, not mechanical: harden the API, let players talk to each other, and keep feeding the content pipeline the CMS already supports.
