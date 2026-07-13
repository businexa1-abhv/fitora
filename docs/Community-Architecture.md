# FitOra Community — Architecture

**Product:** FitOra Community (Sports Social Network)  
**Document:** `Community-Architecture.md`  
**Version:** 1.0  
**Status:** Architecture specification (no implementation)  
**Date:** July 13, 2026  
**Related:** [`FITORA_V2_PRD.md`](./FITORA_V2_PRD.md) · [`Mobile-UX.md`](./Mobile-UX.md) · [`Web-UX.md`](./Web-UX.md)

---

## 1. Vision

### 1.1 Why Community exists

Traditional sports booking apps stop at **inventory → payment → slot**.  
FitOra Community turns play into a **social graph**: find people, form circles, share activity, compete in challenges, and return because *friends are playing*—not only because a court is empty.

**One-liner:** *FitOra is where India plays together.*

### 1.2 Design principles

1. **Sport-contextual social** — Every post, group, and recommendation knows sport + city.  
2. **Play-linked** — Open games, events, and bookings can attach to social objects (never fake engagement).  
3. **Privacy by default** — Location, “playing now”, and kid-related content are opt-in and role-aware.  
4. **Lightweight to viral** — Share to WhatsApp in one tap; in-app graph deepens over time.  
5. **Anti-creep** — No infinite stranger DMs on day one; prefer Circles, Groups, and game threads.  
6. **Orbit-aligned** — Community powers **Belong** (+ hooks into Compete, Play, Earn/Pulse).

### 1.3 Non-goals (v1 architecture)

- Full public Twitter-scale global firehose  
- Dating / random chat  
- Kids posting as first-class authors (parents only; kids appear in academy contexts elsewhere)  
- Live video social (future)

---

## 2. Feature map

| Feature | Job to be done | Priority |
|---------|----------------|----------|
| **Friends** | Bidirectional trusted connections | P0 |
| **Followers** | Uni-directional public follow (players, venues, athletes) | P0 |
| **Nearby Players** | Discover people to play with by city/geo + sport | P0 |
| **Sports Circle** | Implicit/explicit graph per sport (“Badminton circle”) | P0 |
| **Communities** | Topic/city hubs (e.g. “Pune Football”) | P1 |
| **Groups** | Smaller private/semi-public squads | P0 (Squads) |
| **Activity Feed** | Personalized stream of social + play signals | P0 |
| **Photos** | Media on posts, games, achievements | P1 |
| **Achievements** | Milestone records on Passport | P0 |
| **Badges** | Collectible / display flair | P0–P1 |
| **Events** | Social surface for Compete events + RSVP chatter | P0–P1 |
| **Challenges** | Time-boxed social competitions | P1 |
| **Weekly Goals** | Personal/group targets (“3 sessions this week”) | P1 |
| **Leaderboards** | Ranked standings (city/sport/challenge) | P1 |
| **Recommendations** | People, groups, games, events to join | P0 |

---

## 3. Domain architecture

### 3.1 Bounded contexts

```
┌─────────────────────────────────────────────────────────────┐
│                     COMMUNITY PLATFORM                       │
│  Graph · Feed · Media · Gamification · Discovery             │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
    ┌────────▼────────┐         ┌────────▼────────┐
    │  PLAY / COMPETE │         │  IDENTITY       │
    │  Bookings       │         │  Sport Passport │
    │  Open Games     │         │  Privacy prefs  │
    │  Events         │         └─────────────────┘
    └─────────────────┘
             │
    ┌────────▼────────┐
    │  EARN (Pulse)   │
    │  Points hooks   │
    └─────────────────┘
```

Community **owns** social graph & feed.  
It **references** bookings, events, venues, and passports—does not duplicate payment/inventory logic.

### 3.2 Core entities

#### Identity & graph

| Entity | Description |
|--------|-------------|
| `PlayerProfile` | Public social projection of User (bio, sports, city, visibility) |
| `Friendship` | Bidirectional accept graph (`pending` / `accepted` / `blocked`) |
| `Follow` | Uni-directional (`follower` → `followee`); followee may be Player, Venue, Community |
| `Block` / `Mute` | Safety edges |
| `SportsCircleMembership` | User ↔ Sport (+ optional city) membership & strength score |
| `NearbyPresence` | Opt-in ephemeral “available to play” signal |

#### Collective spaces

| Entity | Description |
|--------|-------------|
| `Community` | Large hub (city × sport or interest); roles: owner, mod, member |
| `Group` | Squad-scale (private / invite / public); maps to PRD “Squad” |
| `GroupMembership` | Role: owner, admin, member |
| `CommunityMembership` | Role: member, moderator |

#### Content & feed

| Entity | Description |
|--------|-------------|
| `Post` | Text + optional media + optional attachments |
| `PostAttachment` | Polymorphic: Booking, OpenGame, Event, Achievement, Challenge, Venue, Product |
| `Comment` / `Reaction` | Engagement |
| `MediaAsset` | Photo (video later); moderation state |
| `FeedItem` | Materialized or projected unit for a viewer’s feed |

#### Gamification

| Entity | Description |
|--------|-------------|
| `AchievementDefinition` | Catalog (e.g. “10 bookings”, “First open game host”) |
| `UserAchievement` | Unlocked instance + timestamp |
| `BadgeDefinition` / `UserBadge` | Display badges (some = achievements, some seasonal) |
| `Challenge` | Rules, window, sport, scope (city/group/global) |
| `ChallengeEntry` | User/group progress |
| `WeeklyGoal` | Template + user progress for ISO week |
| `Leaderboard` | Snapshot or live ranking key (scope, metric, period) |
| `LeaderboardEntry` | Subject + score + rank |

#### Discovery

| Entity | Description |
|--------|-------------|
| `Recommendation` | Scored suggestion (type, subject, reason codes) |
| `OpenGame` | Already in Play/Belong — Community indexes & surfaces it |

### 3.3 Relationship diagram (conceptual)

```
User ── PlayerProfile
  ├── Friendship (↔ User)
  ├── Follow (→ Profile|Venue|Community)
  ├── SportsCircleMembership (→ Sport, City?)
  ├── GroupMembership → Group
  ├── CommunityMembership → Community
  ├── Post / Comment / Reaction
  ├── UserAchievement / UserBadge
  ├── WeeklyGoal
  └── ChallengeEntry → Challenge

Post ── MediaAsset[]
Post ── PostAttachment → Booking | Event | OpenGame | …

Group / Community ── Post (space-scoped feed)
```

### 3.4 Sports Circle (distinct concept)

**Sports Circle** is not a Group you “join once.” It is a **per-sport social layer**:

- Auto-grow when user books/plays that sport  
- Powers “Badminton friends”, circle-only leaderboards, circle recommendations  
- Optional explicit “Join Pune Badminton Circle” for city×sport Community bootstrap  

**Strength score** inputs: bookings, open games, mutual friends in sport, challenge participation.

---

## 4. Product surfaces & UX architecture

### 4.1 Mobile (from Mobile-UX)

- **Home rails:** Friends Playing, Game Suggestions, Community Feed  
- **Explore:** People category → Nearby Players  
- **Play:** Open Games segment  
- **Profile:** Passport → Achievements, Badges, Goals, Followers/Following  

### 4.2 Web (from Web-UX)

```
/community
  /feed
  /players/nearby
  /players/[id]
  /friends
  /circles/[sport]
  /communities
  /communities/[slug]
  /groups
  /groups/[id]
  /challenges
  /challenges/[id]
  /leaderboards
  /events (social tab overlays Compete events)
```

### 4.3 Key screens

| Screen | Contents |
|--------|----------|
| **Feed** | Ranked Activity Feed + composer |
| **Profile social** | Avatar, sports, mutual friends, Follow/Add friend, posts grid, badges |
| **Friends** | Friends list, requests, suggestions |
| **Nearby Players** | Map/list, filters sport/skill/availability |
| **Circle** | Sport hub: top players, open games, challenges, join CTA |
| **Community hub** | About, feed, events, mods |
| **Group** | Members, chat/feed, upcoming plays |
| **Challenge detail** | Rules, progress, leaderboard slice |
| **Achievements** | Grid locked/unlocked |
| **Leaderboards** | Scope switcher city/sport/period |

### 4.4 Activity Feed composition

**Item types (examples)**

1. Friend completed a booking / checked in (if visibility allows)  
2. Open game created / spots filling  
3. Group post / photo  
4. Achievement unlocked  
5. Challenge joined / completed  
6. Event registration / result  
7. Weekly goal completed  
8. Followed venue announcement (light)  

**Ranking signals:** affinity (friends > follows > circle > community), recency, sport match, geo, negative feedback (hide/mute).

**Composer attachments:** photo, open game, event, achievement share—not arbitrary links only.

---

## 5. Feature architecture (deep dive)

### 5.1 Friends

- Request → accept / decline / cancel  
- Unfriend, block  
- Friends can see richer activity (per privacy)  
- Cap: soft limit on pending requests; abuse rate limits  

### 5.2 Followers

- Instant follow (no accept) for public profiles  
- Private profiles: follow request (= friend-like) or disable follows  
- Separate counts: friends vs followers vs following  

### 5.3 Nearby Players

**Inputs:** city (required), optional precise geo (opt-in), sport, skill tags, availability window, “looking to play”.  
**Outputs:** ranked players + reason (“2 km · Intermediate · Free Fri 7pm”).  
**Safety:** hide exact location; show approximate distance bands.

### 5.4 Sports Circle

- Landing per sport (+ city variant)  
- Members list (opt-in directory)  
- Embedded open games & challenges  
- Circle leaderboards  

### 5.5 Communities vs Groups

| | **Community** | **Group (Squad)** |
|--|---------------|-------------------|
| Scale | Hundreds–thousands | ~5–50 |
| Join | Open / request / invite | Invite / request |
| Purpose | City×sport culture | Regular play crew |
| Moderation | Mods + platform | Owner/admins |
| Feed | Hub feed | Private/semi feed |

### 5.6 Photos

- Upload to CDN; variants (thumb, feed, full)  
- EXIF strip; malware scan  
- Moderation: async AI + report queue → Command  
- Attach to Post, Achievement celebration, Group album (P2)  

### 5.7 Achievements & Badges

**Achievements** = earned milestones (progress tracked).  
**Badges** = wearable flair (may require achievement or event).

**Engine:** event-driven — listen to domain events (`BookingCompleted`, `OpenGameHosted`, `ChallengeWon`) → evaluate rules → unlock → feed item + Pulse bonus optional.

### 5.8 Events (social layer)

Compete module owns registration/brackets.  
Community adds: discussion thread, photo album, “who from your friends is going”, share cards.

### 5.9 Challenges

**Types:** volume (sessions/week), social (play with 3 friends), streak, event-tied.  
**Scopes:** personal, group, circle, city.  
**Lifecycle:** draft → live → ended → archive; winners → badges/Pulse.

### 5.10 Weekly Goals

- System defaults + user custom (cap N)  
- Progress from bookings/attendance/check-ins  
- Monday reset (timezone = user city)  
- Surface on Home + Profile  

### 5.11 Leaderboards

**Metrics:** sessions, open games hosted, challenge score, Pulse earned (careful), fairplay (later).  
**Anti-cheat:** verified actions only (paid booking, check-in), anomaly flags.  
**Freshness:** hourly rollup jobs + on-read cache.

### 5.12 Recommendations

**Candidate generators**

- People: nearby + same sport + mutual friends  
- Groups: friends’ groups, circle popular  
- Open games: sport/time match  
- Challenges / events: city + sport  
- Friends: contact sync (opt-in, P2)  

**Ranker:** logistic/heuristic v1 → ML later (existing AI module).  
**Explanations:** always show reason chips.

---

## 6. System architecture

### 6.1 Services (modular monolith first)

Within `apps/api`, new module(s):

```
community/
  graph/          friends, follows, blocks, circles
  spaces/         communities, groups, memberships
  feed/           posts, comments, reactions, feed assembly
  media/          upload intents, moderation hooks
  gamification/   achievements, badges, challenges, goals, leaderboards
  discovery/      nearby, recommendations
  moderation/     reports, strikes (admin hooks)
```

Keep **Open Games** in Belong/Play module but emit events consumed by feed/discovery.

### 6.2 Data store

| Store | Use |
|-------|-----|
| **Postgres** | Source of truth for graph, posts, gamification |
| **Redis** | Feed fanout cache, rate limits, leaderboard ZSETs, presence TTL |
| **Object storage** | Photos |
| **Search (OpenSearch/Postgres FTS)** | People/community search |

### 6.3 Feed strategy

**Phase 1 — Pull + small fanout**

- On post: write to author timeline + fanout to friends’ inbox tables (cap)  
- Followers of high-degree users: pull-on-read hybrid  

**Phase 2 — Ranking service**

- Candidate retrieval → rank → cache per user  

**Table sketch:** `feed_inbox(user_id, feed_item_id, score, created_at)`.

### 6.4 Event bus (internal)

Domain events (Nest/BullMQ already in stack):

```
FriendshipAccepted
UserFollowed
PostCreated
MediaUploaded
BookingCompleted
OpenGameCreated
OpenGameJoined
EventRegistered
AchievementUnlocked
ChallengeProgressed
WeeklyGoalCompleted
UserReported
```

Gamification and feed workers subscribe.

### 6.5 API surface (logical)

```
Graph:    POST /community/friends/requests …
          POST /community/follows
          GET  /community/players/nearby
Spaces:   CRUD /community/groups|communities
Feed:     GET  /community/feed
          POST /community/posts
Media:    POST /community/media/upload-url
Games:    (existing open-game endpoints + social enrich)
Gamif:    GET  /community/achievements
          GET  /community/badges
          CRUD /community/challenges (admin/organizer)
          GET  /community/goals/weekly
          GET  /community/leaderboards
Discovery:GET  /community/recommendations
Mod:      POST /community/reports
```

BFF aggregate: `GET /community/home` for mobile Home rails.

### 6.6 Realtime (phased)

- P0: poll / pull-to-refresh  
- P1: websocket or SSE for group threads & open-game seat updates  
- Presence: Redis TTL keys for “looking to play”

---

## 7. Privacy, safety, trust

### 7.1 Visibility levels

| Level | Who sees activity |
|-------|-------------------|
| Public | Anyone |
| Followers | Followers + friends |
| Friends | Friends only |
| Circle | Sports circle members (sport-scoped) |
| Group | Group members |
| Private | Only me |

Defaults: bookings **Friends**; open games **Public** (discoverable); precise location **Off**.

### 7.2 Safety toolkit

- Block / mute / report  
- Rate limits on DMs (when chat ships), friend requests, posts  
- Photo moderation pipeline  
- Under-18: restricted public profile; no nearby with precise geo  
- Command Support/Trust queues for reports  

### 7.3 Permissions

Consumer: standard auth.  
Mods: community roles.  
Platform: Super Admin CMS/Trust (`community.moderate`).

---

## 8. Integration with existing FitOra

| System | Integration |
|--------|-------------|
| **Bookings** | Feed + achievements; “Friends playing” from upcoming friend bookings |
| **Open Games** | Primary social inventory |
| **Events** | Social layer + challenges |
| **Passport** | Achievements, badges, sports, follower counts |
| **Pulse / Earn** | Award points on unlocks/challenges |
| **Venues** | Follow venues; venue posts (P1) |
| **Academy** | Group auto-create per batch (optional P2)—parents only |
| **Notifications** | Friend request, feed mentions, challenge ending, nearby match |

---

## 9. Analytics & success metrics

| Metric | Intent |
|--------|--------|
| WAU Community | Users with ≥1 social action / week |
| Friend edges / WAU | Graph density |
| Open game fill rate | Social → play conversion |
| Feed CTR → booking/event | Monetization bridge |
| Challenge completion rate | Habit loops |
| Report rate | Safety health |

---

## 10. Scalability & performance

- Paginate feed & friends; cursor-based  
- Denormalize counts (followers, posts) with async reconcile  
- Leaderboard ZSET per scope key; rebuild nightly  
- Nearby: city filter first; geo only if opt-in + indexed  
- CDN for media; signed upload URLs  

---

## 11. Suggested package / module layout (monorepo)

```
apps/api/src/community/          # Nest module
packages/types/src/community.ts  # DTOs & enums
apps/web/src/app/community/      # Web routes
apps/mobile/.../community/       # Screens
docs/Community-Architecture.md   # This doc
```

Shared types examples: `FriendshipStatus`, `PostType`, `ChallengeStatus`, `LeaderboardScope`, `Visibility`.

---

## 12. Delivery roadmap

### Phase 0 — Foundations

- PlayerProfile social fields + privacy  
- Friends + Follows + Block  
- Groups (Squads) CRUD + membership  
- Basic Post + Feed (friends-only)  
- Open Game social surfaces  

### Phase 1 — Discovery & identity

- Nearby Players  
- Sports Circle hubs  
- Recommendations v1  
- Achievements + Badges engine  
- Photos on posts  
- Web `/community`  

### Phase 2 — Competition social

- Communities (city×sport)  
- Challenges + Weekly Goals  
- Leaderboards  
- Event social threads  
- Feed ranking v2  

### Phase 3 — Network effects

- Realtime seats/chat  
- Venue follow & posts  
- Advanced ML recommendations  
- Seasonal badge economy + Pulse partners  

---

## 13. Threats & mitigations

| Risk | Mitigation |
|------|------------|
| Spam / fake accounts | Phone/email verify, rate limits, device signals |
| Harassment | Block, report, mod tools, under-18 rules |
| Scraping nearby | Auth + rate limit + coarse distance |
| Leaderboard cheating | Verified events only; anomaly jobs |
| Feed cost explosion | Hybrid fanout; celebrity pull |

---

## 14. Open decisions

| Topic | Options | Recommendation |
|-------|---------|----------------|
| Chat | In-app vs WhatsApp-only | **WhatsApp share P0**; in-app group chat P2 |
| Follow venues | Yes / later | **P1** |
| Public global feed | Yes / no | **No** — personalized + circle/community only |
| Skill system | Self-tag vs verified | **Self-tag P0**; verified later via play data |
| Dual Friends+Follows | Complexity | **Keep both** — friends = trust; follow = interest |

---

## 15. Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-13 | Complete Community architecture — social graph, feed, gamification, discovery |

**Out of scope:** Application source code, pixel UI.  
**Next:** ERD/Prisma draft → API OpenAPI → mobile/web Community epic breakdown.
