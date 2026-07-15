# @fitora/owner-app

FitOra Owner / Academy Management mobile app (Expo), built from the Stitch project **FitOra Academy Management App**.

## Screens (Stitch)

| Screen                   | Route                   |
| ------------------------ | ----------------------- |
| Welcome to FitOra Owner  | `/(auth)/welcome`       |
| Owner Login              | `/(auth)/login`         |
| Academy Dashboard        | `/(tabs)`               |
| Court Inventory & Status | `/(tabs)/courts`        |
| Performance Analytics    | `/(tabs)/analytics`     |
| Notifications Center     | `/(tabs)/notifications` |
| Settings                 | `/(tabs)/more`          |

Design downloads: `docs/stitch/fitora-academy-management-app/`

## Run

```bash
pnpm --filter @fitora/owner-app... install
pnpm dev:api
pnpm dev:owner
```

## Login (local)

After partner onboarding + admin approval:

- Email: the institutional email from registration (e.g. `businexa1@gmail.com`)
- Password: set at registration (shown on submit), or for local testing: `OwnerPass123!`

Role: API `COURT_OWNER` (Owner tab). Coach tab expects `TRAINER`.

New owners register via partner web: `http://localhost:3011/register/business`
