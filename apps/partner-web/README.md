# @fitora/partner-web

Owner / venue-partner onboarding portal powered by the FitOra Stitch partner registration flow.

## Routes

- `/` — Partner landing page
- `/register/business` — Step 1 business profile + OTP
- `/register/venue` — Venue details & amenities
- `/register/sports` — Sports & pricing config
- `/register/trainers` — Optional trainers
- `/register/legal` — Legal & banking
- `/register/review` — Final review & submit
- `/register/submitted` — Application submitted
- `/dashboard` — Post-submit partner dashboard

## Local setup

```bash
pnpm install
pnpm --filter @fitora/partner-web dev
```

Requires API at `NEXT_PUBLIC_API_URL` (default `http://localhost:3001/api/v1`).

In development, mobile OTP accepts `123456` after clicking **Get OTP**.
