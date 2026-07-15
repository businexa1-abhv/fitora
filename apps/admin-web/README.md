# @fitora/admin-web

Enterprise admin console (port **3010**) for partner verification, finance overview, and CMS.

## Flow

1. Venue owner completes onboarding in `partner-web`
2. Application lands in **Management → Verification Queue** (`UNDER_REVIEW`)
3. Admin clicks **Approve & Go Live**
4. API activates tenant + approves all courts
5. Venue becomes visible in the player mobile app (`GET /courts`)

## Local

```bash
pnpm install
pnpm dev:admin-web
```

Login with seeded admin: `admin@fitora.com` / `AdminPass123!`
