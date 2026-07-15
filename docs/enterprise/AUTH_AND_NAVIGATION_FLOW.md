# FitOra Authentication and Navigation Flow

## Roles
- ADMIN
- OWNER
- COACH
- PLAYER
- SHOP_OWNER

## Authentication
Supported providers:
- Mobile OTP
- Google OAuth
- Apple Sign In

Token strategy:
- short-lived JWT access token
- rotating refresh token
- secure storage on device/web

## Player App Flow
Expo native splash -> app initialization -> auth hydration -> stitched login if unauthenticated -> player routes if authenticated.

## Owner App Flow
Expo native splash -> app initialization -> auth hydration -> stitched owner login -> role-based navigation.
- OWNER route group: courts, bookings, memberships, coaches, students, revenue, reports
- COACH route group: students, attendance, training, videos, feedback

## Protected Route Strategy
- frontend guard checks auth + role + subscription entitlement
- backend guard enforces role and policy at API boundary
- routes/modules not allowed by role are never registered

## Owner Subscription Guard
If owner subscription is expired:
- show renew-subscription route
- block new booking and membership mutations
- hide venue from player discovery in backend queries

## Deep Link Security
- ignore protected deep links until auth state is ready
- resolve post-login redirect only after role and entitlement checks
