# FitOra AI — Complete Architecture

**Product:** FitOra AI (Assist · Recommend · Insights)  
**Document:** `AI-Architecture.md`  
**Version:** 1.0  
**Status:** Architecture specification (no implementation)  
**Date:** July 13, 2026  
**Related:** [`FITORA_V2_PRD.md`](./FITORA_V2_PRD.md) · [`Explore-UX.md`](./Explore-UX.md) · [`Play-Architecture.md`](./Play-Architecture.md) · [`Community-Architecture.md`](./Community-Architecture.md) · [`Venue-OS-UX.md`](./Venue-OS-UX.md)

---

## 1. Vision

### 1.1 Role of AI in FitOra

FitOra AI is the **decision and coaching layer** across the ecosystem. It does not replace booking, payments, or Venue OS—it **ranks, explains, generates, and alerts** using Sport Passport + live inventory + social graph + business metrics.

**One-liner:** *The sports OS that knows what you should play next—and how venues should grow.*

### 1.2 Design principles

1. **Retrieval before generation** — Prefer ranked candidates from FitOra data; LLMs explain/rank/generate plans, not invent venues.  
2. **Always explain** — Every suggestion shows reason chips (“Near you”, “Fits U-10”, “Friends play here”).  
3. **Orbit-aware** — Consumer Assist vs Coach Assistant vs Venue Revenue Insights use different tools & permissions.  
4. **Safe for India sports** — Diet/workout are guidance, not medical advice; disclaimers + age gates.  
5. **Cost-aware** — Cache embeddings & recommendations; degrade to heuristic rankers when LLM budget exhausted.  
6. **Human override** — Owners/coaches can dismiss insights; users can tune preferences.  
7. **Grounded in shipped AI** — Extend existing `apps/api` AI module (courts, memberships, batches, products, services, workout, diet).

### 1.3 Capability map

| Capability | Audience | Type |
|------------|----------|------|
| Suggest Courts | Player | Recommend |
| Suggest Players | Player | Recommend (social) |
| Suggest Games / Matches | Player | Recommend |
| Suggest Memberships | Player | Recommend |
| Suggest Training | Player | Recommend |
| Suggest Products | Player | Recommend |
| Suggest Services | Player | Recommend |
| Suggest Kids Programs | Parent | Recommend |
| Personal Workout | Player | Generate |
| Diet | Player | Generate |
| Sports Insights | Player | Insights |
| Coach Assistant | Trainer | Assist + Generate |
| Venue Revenue Insights | Court Owner | Insights + Alerts |

---

## 2. System architecture

### 2.1 High-level

```
┌──────────── Mobile / Web / Venue OS / Coach Desk ────────────┐
│                     FitOra AI Gateway (API)                    │
└─────────────┬──────────────────────────┬─────────────────────┘
              │                          │
     ┌────────▼────────┐        ┌────────▼────────┐
     │  Orchestrator   │        │  Policy / Guard │
     │  (agents/tools) │        │  PII · age · $  │
     └────────┬────────┘        └─────────────────┘
              │
   ┌──────────┼──────────┬──────────────┬─────────────┐
   │          │          │              │             │
┌──▼───┐  ┌───▼────┐ ┌───▼────┐  ┌──────▼─────┐ ┌─────▼─────┐
│Ranker│  │Retriever│ │LLM     │  │Feature     │ │Insight    │
│(heur/│  │(SQL/vec)│ │Provider│  │Store       │ │Jobs       │
│ ML)  │  │         │ │        │  │            │ │(batch)    │
└──┬───┘  └───┬────┘ └───┬────┘  └──────┬─────┘ └─────┬─────┘
   │          │          │              │             │
   └──────────┴──────────┴──────────────┴─────────────┘
              │
     Domain DBs: Courts · Bookings · Play · Community · Shop · Training · Analytics
```

### 2.2 Layers

| Layer | Responsibility |
|-------|----------------|
| **Gateway** | AuthZ, rate limits, feature flags, request tracing |
| **Orchestrator** | Route intent → tools → compose response + reasons |
| **Retrievers** | Candidate generation from Postgres / search / embeddings |
| **Rankers** | Score candidates (heuristic → Learning-to-Rank → LLM re-rank) |
| **Generators** | Workout, diet, coach copy, insight narratives |
| **Feature store** | User/venue/sport features for ranking |
| **Insight jobs** | Nightly/hourly venue & player insight materialization |
| **Providers** | OpenAI (existing) + mock provider; swappable |

### 2.3 Monorepo placement

```
apps/api/src/ai/
  gateway/           # controller + DTOs (extend current)
  orchestrator/      # intent routing
  context/           # AiContextService (exists) — Passport, history
  retrieval/         # courts, players, matches, catalog, programs
  ranking/           # scorers
  generation/        # workout, diet, narratives
  insights/          # sports + venue revenue + coach packs
  providers/         # openai, mock
  safety/            # filters, disclaimers
  eval/              # offline eval harness (P2)
```

Keep **modular monolith**; extract “insight worker” service only if CPU/GPU load demands.

---

## 3. Context model (shared brain)

### 3.1 Sport Passport context

Inputs to almost all consumer suggestions:

- Sports played & affinity scores  
- Home city + recent geos  
- Skill self-tags / observed play times  
- Booking history, no-shows, preferred venues  
- Memberships active  
- Kids profiles (age, sports)—**parent session only**  
- Social: friends, circles, groups  
- Favorites / collections  
- Pulse / goals / challenges  
- Explicit prefs (budget, indoor-only, evenings)

### 3.2 Session context

- Active city + sport chips (Explore/Home)  
- Time of day / day of week  
- Device (mobile vs web)  
- Intent hint (`tonight`, `kids`, `gear`, `coach`)

### 3.3 Business context (owner/coach)

- Branch, courts, occupancy, pricing, GMV  
- Trainer assignments, batch fill rates  
- Inventory / service SLAs  

**Isolation:** Venue insights never leak another venue’s private data; coach sees only assigned batches.

---

## 4. Feature architectures

### 4.1 Suggest Courts

**Goal:** Rank venues/courts for play now or plan-ahead.

**Pipeline**

1. **Retrieve:** city + sport + open slots in window + amenities filters  
2. **Filter:** unpublished, blocked, outside radius  
3. **Score:** distance, price fit, rating, past visits, friend activity, availability tonight, membership benefit  
4. **Optional LLM re-rank** top-K with reasons  
5. **Return:** courts + reason codes + deep link to book  

**API (logical):** `POST /ai/recommendations/courts` *(exists)*  
**UX:** Explore Recommendations, Home Nearby bias, post-booking “play again.”

### 4.2 Suggest Players

**Goal:** Who to invite or play with (Community/Play).

**Retrieve:** nearby opt-in presence, same sport circle, mutual friends, skill band, availability overlap.  
**Safety:** privacy flags, blocks, under-18 rules, coarse distance only.  
**Score:** sport match, mutuals, reciprocity, fairness (avoid always same people).  
**UX:** Host Match → Invite suggestions; Nearby Players; “Complete your doubles.”  
**API:** `POST /ai/recommendations/players`

### 4.3 Suggest Games (Matches)

**Goal:** Open matches to join.

**Retrieve:** Play open listings (city, sport, seats, time).  
**Score:** time fit, skill, friends attending, price share affordability, fill urgency.  
**UX:** Home Game Suggestions; Play Open Games sort “For you.”  
**API:** `POST /ai/recommendations/matches`  
**Depends on:** Play module listings.

### 4.4 Suggest Memberships

**Goal:** Plans that beat pay-as-you-go for this user’s pattern.

**Signals:** booking frequency, spend, venues used, sport concentration.  
**Logic:** estimate break-even weeks; prefer venues user already visits.  
**API:** `POST /ai/recommendations/memberships` *(exists)*  
**UX:** Memberships page, checkout upsell, Home Membership Offers.

### 4.5 Suggest Training

**Goal:** Adult/coaching batches and programs.

**Signals:** sport, schedule gaps, skill, location, peer enrollments.  
**API:** `POST /ai/recommendations/training-batches` *(exists)*  
**UX:** Explore Training rail; Train tab.

### 4.6 Suggest Products

**Goal:** Gear relevant to sport + recent play + wear/replace cycles.

**Signals:** sport, last booking (e.g. badminton → grips/shuttles), past purchases, event kits.  
**API:** `POST /ai/recommendations/products` *(exists)*  
**UX:** Explore Featured + Store “For you”; post-match Equip upsell.

### 4.7 Suggest Services

**Goal:** Stringing/repair/rental timing.

**Signals:** days since last stringing service, racket purchase, match frequency.  
**API:** `POST /ai/recommendations/services` *(exists)*  
**UX:** Explore Services; booking confirmation module.

### 4.8 Suggest Kids Programs

**Goal:** Age-appropriate academies for linked kids.

**Signals:** kid age, sport interest, parent city, schedule vs parent bookings, batch capacity.  
**Guard:** Never recommend using kid PII in prompts beyond age band + sport; mask names in logs.  
**API:** `POST /ai/recommendations/kids-programs`  
**UX:** Explore Kids Academies; Home parent mode.

### 4.9 Personal Workout

**Goal:** Generate a plan (days, exercises, duration) for a sport/goal.

**Inputs:** sport, goal (fitness/skill), days/week, equipment, injuries (user-entered).  
**Pipeline:** template library (sport-specific) + LLM fill/adapt + safety filter.  
**Output:** structured plan JSON + disclaimer.  
**API:** `POST /ai/generate/workout-plan` *(exists)*  
**UX:** Profile / Train → “AI Workout”; save to Weekly Goals optional.

### 4.10 Diet

**Goal:** Sports nutrition tips / simple day plans.

**Inputs:** sport, goal, dietaryRestrictions, cuisine preference (India-aware).  
**Pipeline:** rule-based macros sketch + LLM tips; **not** medical diagnosis.  
**API:** `POST /ai/generate/diet-tips` *(exists)*  
**UX:** Same Assist area; hard disclaimer; block under-13 personalized diet (general tips only).

### 4.11 Sports Insights (player)

**Goal:** Personal analytics narrative—“You play most on Tue evenings; occupancy is high then—book earlier.”

**Inputs:** booking history, attendance, ratings, goals progress, circle stats.  
**Pipeline:** batch feature compute → insight cards (deterministic) → optional LLM summary.  
**Types:** habit, improvement, social, savings (membership), streak risk.  
**API:** `GET /ai/insights/me`  
**UX:** Passport Insights tab; weekly push digest.

### 4.12 Coach Assistant

**Goal:** Help trainers plan sessions, message parents, summarize attendance/progress.

**Tools**

- Pull assigned batches, roster, attendance gaps  
- Draft session plan for age/sport  
- Draft progress note from attendance + prior notes  
- Suggest drills (library + LLM)  
- Flag at-risk kids (low attendance)—human confirm before notify  

**API:**  
`POST /ai/coach/session-plan`  
`POST /ai/coach/progress-draft`  
`GET /ai/coach/batch-insights/{batchId}`  

**UX:** Coach Desk → Assistant panel.  
**AuthZ:** Trainer role + batch assignment only.

### 4.13 Venue Revenue Insights

**Goal:** Owner-facing growth recommendations.

**Insight catalog (examples)**

| Insight | Trigger | Suggested action |
|---------|---------|------------------|
| Off-peak hollow | Occupancy &lt; X% band | Dynamic price / open match promo |
| Court imbalance | Court A full, B empty | Reprice B / move academy |
| Membership opportunity | Repeat bookers without plan | Push plan offer |
| Cancellation spike | Rate ↑ | Policy / reminders |
| Academy fill risk | Batch &lt; 60% | Discount / ads |
| Weather/seasonality | Historical | Slot generation tips |

**Pipeline:** nightly jobs per venue/branch → store `venue_insights` → API list → optional LLM narrative for GM summary.  
**API:** `GET /ai/insights/venue/{venueId}` · `POST /ai/insights/venue/{venueId}/refresh`  
**UX:** Venue OS Dashboard “AI Insights” module.  
**AuthZ:** Venue owner/manager for that venue only.

---

## 5. Orchestrator & intents

### 5.1 Intent router

| Intent | Handler |
|--------|---------|
| `recommend.courts` | Courts pipeline |
| `recommend.players` | Players pipeline |
| `recommend.matches` | Matches pipeline |
| `recommend.memberships` | Memberships |
| `recommend.training` | Training |
| `recommend.products` | Products |
| `recommend.services` | Services |
| `recommend.kids_programs` | Kids |
| `generate.workout` | Workout gen |
| `generate.diet` | Diet gen |
| `insights.player` | Sports Insights |
| `assist.coach.*` | Coach tools |
| `insights.venue` | Revenue insights |
| `assist.freeform` (P2) | Constrained chat with tools only |

### 5.2 Response contract (all recommend)

```
{
  items: [{ id, type, score, reasons: [{ code, label }], payload }],
  model: { ranker, llm?: boolean },
  context: { city, sport },
  disclaimer?: string
}
```

No fabricated IDs—items must exist in DB.

---

## 6. Ranking & ML strategy

### Phase A — Heuristic (now → MVP+)

Weighted linear scores; hand-tuned per surface; LLM optional re-rank top 10.

### Phase B — Features + LTR

Log impressions/clicks/bookings (`explore_rail_click`, `book_start`).  
Train lightweight ranker (sport/city models).  
Embeddings for products/programs (“similar to”).

### Phase C — Personalization

Two-tower / sequential models for courts & products; bandits for Home rail order.

**Cold start:** city trending + sport chip + popularity.

---

## 7. Generation architecture

### 7.1 Provider abstraction

Existing OpenAI provider + **MockProvider** for `PAYMENT_MODE`-like `AI_MODE=mock|live`.  
Timeouts, token caps, JSON schema validation (reject malformed workout JSON).

### 7.2 Prompt policy

- System prompts include: India sports context, safety, no medical claims, no inventing venues.  
- Inject **only retrieved facts** (court names from tool output).  
- Strip PII from prompts where possible (use opaque ids + labels).

### 7.3 Template + LLM hybrid

Workout/diet/coach: start from **approved templates** per sport/age; LLM adapts within bounds (intensity caps, banned exercises list).

---

## 8. Data & storage

| Store | Use |
|-------|-----|
| Postgres | Source entities; `ai_recommendation_logs`; `ai_insights` materializations |
| Redis | Cache recommendation responses (TTL 5–30m); rate limits |
| Object/CDN | Optional embedding index exports |
| Vector (pgvector / external) | Similar products, similar venues (P1) |

### 8.1 Tables (logical)

**`ai_recommendation_events`** — user_id, intent, context_json, item_ids, reasons, latencies, model versions.  
**`ai_feedback`** — user_id, item_id, action (click, dismiss, book, enroll).  
**`ai_player_insights`** — user_id, insight_type, payload, valid_until.  
**`ai_venue_insights`** — venue_id, branch_id, insight_type, severity, payload, created_at.  
**`ai_generation_runs`** — user_id, kind (workout/diet/coach), input_hash, output_json, tokens, status.

---

## 9. Safety, compliance, ethics

| Risk | Control |
|------|---------|
| Hallucinated venues/products | ID allowlist from retriever only |
| Medical harm (diet/workout) | Disclaimers; injury soft-block; under-age limits |
| Kid PII leakage | Age-band features; audit access; no freeform kid chat |
| Owner data leakage | Strict venue scoping |
| Prompt injection | Tool-only freeform; sanitize user text |
| Bias | Monitor suggestion diversity; audit by city/sport |
| Cost abuse | Per-user daily gen quotas; flag gated |

**Feature flags:** `ai.recommend.*`, `ai.generate.*`, `ai.insights.venue`, `ai.coach.assistant`.

---

## 10. API surface (complete logical)

Consumer:

```
POST /ai/recommendations/courts
POST /ai/recommendations/players
POST /ai/recommendations/matches
POST /ai/recommendations/memberships
POST /ai/recommendations/training-batches
POST /ai/recommendations/products
POST /ai/recommendations/services
POST /ai/recommendations/kids-programs
POST /ai/generate/workout-plan
POST /ai/generate/diet-tips
GET  /ai/insights/me
POST /ai/feedback
```

Coach:

```
POST /ai/coach/session-plan
POST /ai/coach/progress-draft
GET  /ai/coach/batch-insights/:batchId
```

Venue:

```
GET  /ai/insights/venue/:venueId
POST /ai/insights/venue/:venueId/dismiss
POST /ai/insights/venue/:venueId/refresh
```

Admin (Command):

```
GET /ai/admin/usage
GET /ai/admin/eval-summary
```

---

## 11. Jobs & realtime

| Job | Cadence | Output |
|-----|---------|--------|
| `ai.insights.player.weekly` | Weekly | Player insight cards + optional push |
| `ai.insights.venue.hourly` | Hourly | Occupancy/revenue alerts |
| `ai.insights.venue.daily` | Daily | GM digest |
| `ai.embeddings.catalog` | Daily | Product/program vectors |
| `ai.ranker.refresh` | Weekly | Model artifacts (P2) |

Realtime: not required for v1 recommendations (request/response + cache).

---

## 12. UX integration map

| Surface | AI use |
|---------|--------|
| Home / Explore | Recommendations rail + reason chips |
| Play Host Match | Suggest players / fill seats |
| Memberships / Checkout | Plan suggest |
| Store / Services | For you / post-play upsell |
| Profile Passport | Sports Insights + Workout/Diet |
| Coach Desk | Assistant side panel |
| Venue OS Dashboard | Revenue Insights cards → deep link Slot/Membership actions |
| Command | Usage, kill switches, prompt config (P2) |

---

## 13. Evaluation & quality

- **Offline:** Recall@K vs historical next booking; reason coverage.  
- **Online:** CTR, book/enroll conversion, dismiss rate, gen regenerate rate.  
- **Human eval:** Spot-check diet/workout safety weekly.  
- **Shadow mode:** New ranker logs without changing UI.

---

## 14. Cost & SLOs

| Path | Latency target (p95) | Notes |
|------|----------------------|-------|
| Heuristic recommend | &lt; 300ms | Cacheable |
| Recommend + LLM re-rank | &lt; 2.5s | Cap K=10 |
| Workout/diet generate | &lt; 8s | Async job optional |
| Venue insights read | &lt; 200ms | Precomputed |

Budget alerts when token spend &gt; daily threshold → auto `AI_MODE` degrade to heuristic.

---

## 15. Delivery roadmap

### Phase A — Harden existing + explainability

Courts, memberships, training, products, services · structured reasons · feedback logging · flags · mock/live providers

### Phase B — Social play + kids + insights

Players · Matches · Kids programs · Sports Insights (player) · Explore wiring

### Phase C — Operator AI

Coach Assistant · Venue Revenue Insights · digests · dismiss/action loops

### Phase D — Learning systems

Embeddings · LTR · personalized Home rail order · eval harness · freeform tool chat (constrained)

---

## 16. Open decisions

| Topic | Options | Recommendation |
|-------|---------|----------------|
| In-app AI chat | Omnibox vs per-surface | **Per-surface first**; global Assist P2 |
| On-device models | Yes / no | **No for v1** (server providers) |
| Multi-LLM | OpenAI only vs router | **Provider interface**; start OpenAI |
| Auto-apply venue price changes | Auto vs suggest | **Suggest only** — owner confirms |
| Parent workout for kids | Generate / block | **Block personalized**; link to academy |

---

## 17. Relation to current code

Already present in API (extend, don’t rewrite):

- `recommendCourts` · `recommendMemberships` · `recommendTrainingBatches` · `recommendProducts` · `recommendServices`  
- `generateWorkoutPlan` · `generateDietTips`  
- `AiContextService` · OpenAI provider  

**Gaps to build:** players, matches, kids-programs, sports insights, coach assistant, venue revenue insights, feedback store, insight jobs, reason-code standard, stronger grounding guards.

---

## 18. Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-13 | Complete FitOra AI architecture — all suggestion & insight surfaces |

**Out of scope:** Model weights, prompt text dumps, application source.  
**Next:** OpenAPI for new endpoints · insight schema · Venue OS Insights UI epic · eval dataset plan.
