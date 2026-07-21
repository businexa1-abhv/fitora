# Community Hub

FitOra's Community Hub replaces WhatsApp groups for sports communities — badminton, cricket, football, tennis, pickleball, and more — with first-party groups, match organization, chat, and owner/coach integrations.

## Architecture

| Layer | Responsibility |
|-------|----------------|
| PostgreSQL | Source of truth for groups, members, matches, messages, friendships, moderation |
| NestJS `CommunityModule` | REST APIs + role/permission checks |
| Socket.IO `/realtime` | Live chat, typing, presence, match updates, join requests, announcements |
| Player app Community tab | Primary consumer — home, groups, chat, matches, friends |
| Owner / Coach apps | Venue communities, broadcasts, academy batch groups |
| Notifications | Join requests, match reminders, mentions, announcements |

## Domain model (Prisma)

- `CommunityGroup` — public/private/invite-only clubs with sport, skill, privacy, cover, emoji
- `CommunityGroupMember` — OWNER / ADMIN / CO_ADMIN / MODERATOR / MEMBER + mute/ban
- `CommunityJoinRequest` — approve / reject / waitlist
- `CommunityMatch` + `CommunityMatchPlayer` — organizer, RSVP, live/complete
- `CommunityMessage` + reactions / receipts / pins — WhatsApp-style chat
- `CommunityAnnouncement` — admin broadcasts (court changed, fees due, weather, …)
- `CommunityFriendship` / `CommunityBlock` / `CommunityReport` — social graph + moderation
- `CommunityFeedItem` — home feed cards
- `CommunityMatchReminder` — 24h / 2h / 30m / 15m offsets

## Permissions

| Permission | Roles |
|------------|-------|
| `community:read` | Player, Trainer, Court Owner, Admin |
| `community:write` | Player, Trainer, Court Owner, Admin |
| `community:moderate` | Trainer, Court Owner, Admin (+ group admin roles) |
| `community:manage` | Court Owner, Admin |

## Key API surfaces

- `GET /community/home`
- `POST /community/groups`, `GET /community/groups/:id`, join/leave/admin actions
- `POST /community/matches`, RSVP, check-in, live controls
- `GET|POST /community/groups/:id/messages`
- `POST /community/matches/from-booking` — booking success → community match
- `GET /community/search`
- Friends, announcements, polls, reports

## Realtime rooms

- `community:group:{groupId}` — messages, typing, announcements, match patches
- `community:user:{userId}` — join-request decisions, friend requests, DMs of record

## Player navigation

Bottom tab **Community** → home feed. Stack routes under `app/community/**` for create group, group detail, chat, match organizer, friends, search.

## Owner / Coach

- Owner creates tenant-linked communities and broadcasts announcements / tournaments.
- Coach creates `ACADEMY_BATCH` groups linked to `TrainingBatch` for attendance + training chat.

## Match reminders

On match create, schedule `CommunityMatchReminder` rows at −24h, −2h, −30m, −15m. Cron job `community-match-reminder` (every 5 minutes) dispatches `COMMUNITY_MATCH_REMINDER` notifications.

## Migration

`apps/api/prisma/migrations/20260721114500_community_hub`

## Remaining polish

- Friends “nearby” city filter is limited until User profiles store city.
- Trending currently uses the `isTrending` flag (seed/admin); no auto-scoring job yet.
- Media upload is URL-based (same pattern as court images / print designs); object storage can replace later.
- GIF/sticker packs and spam ML detection are UI/contract-ready but not third-party integrated.
