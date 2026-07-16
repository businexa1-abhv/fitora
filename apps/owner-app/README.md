# @fitora/owner-app

FitOra Owner / Academy Management mobile app (Expo), built from the Stitch project **FitOra Academy Management App**.

Supports **two role logins** on the same app (`pnpm dev:owner`):

| Role  | Toggle on login | Demo credentials                         |
| ----- | --------------- | ---------------------------------------- |
| Owner | Owner tab       | `businexa1@gmail.com` / `OwnerPass123!`  |
| Coach | Coach tab       | `trainer@fitora.com` / `TrainerPass123!` |

Coach mode persists as `appMode=coach` and shows the orange FitOra Coach shell (Home · Students · Training · Analytics · Profile).

## Screens (Stitch)

### Owner

| Screen                   | Route                   |
| ------------------------ | ----------------------- |
| Welcome to FitOra Owner  | `/(auth)/welcome`       |
| Owner Login              | `/(auth)/login`         |
| Academy Dashboard        | `/(tabs)`               |
| Court Inventory & Status | `/(tabs)/courts`        |
| Performance Analytics    | `/(tabs)/analytics`     |
| Notifications Center     | `/(tabs)/notifications` |
| Settings                 | `/(tabs)/more`          |

### Coach

| Screen                 | Route                           |
| ---------------------- | ------------------------------- |
| Coach Dashboard        | `/(tabs)`                       |
| Student Directory      | `/(tabs)/students`              |
| Student Profile Detail | `/coach/student/[enrollmentId]` |
| Training Schedule      | `/(tabs)/schedule`              |
| Training Plan Builder  | `/coach/training-plan`          |
| Analytics Overview     | `/(tabs)/analytics`             |
| Performance Report     | `/coach/report/[enrollmentId]`  |
| QR Attendance Scanner  | `/coach/qr-attendance`          |
| Profile / Leave        | `/(tabs)/profile`               |
| Manual Attendance      | `/(tabs)/attendance`            |

Design downloads: `docs/stitch/fitora-academy-management-app/`

## Run

```bash
pnpm --filter @fitora/owner-app... install
pnpm dev:api
pnpm db:seed          # ensures trainer@fitora.com exists
pnpm dev:owner        # prints Owner + Coach credentials, Expo on :8082
```

## Login (local)

1. Open login → choose **Owner** or **Coach** (demo emails auto-swap).
2. Owner needs API role `COURT_OWNER`; Coach needs `TRAINER`.
3. New owners register via partner web: `http://localhost:3011/register/business`
