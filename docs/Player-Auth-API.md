# Player Authentication API

Base URL: `/api/v1`

## Auth

### `POST /auth/send-otp`
Send OTP for player phone auth. Purpose is inferred (LOGIN if phone exists, REGISTER otherwise).

```json
{ "phone": "9876543210" }
```

Response:
```json
{ "message": "OTP sent successfully", "expiresIn": 300 }
```

### `POST /auth/verify-otp`
Verify OTP. Creates a stub PLAYER account when the phone is new.

```json
{ "phone": "9876543210", "otp": "123456", "deviceId": "optional-device-id" }
```

Response:
```json
{
  "user": {
    "id": "...",
    "firstName": "Player",
    "onboardingComplete": false,
    "phoneVerified": true
  },
  "tokens": { "accessToken": "...", "refreshToken": "..." },
  "isNewUser": true
}
```

Aliases also available: `POST /auth/otp/send`, `POST /auth/otp/verify`.

### `POST /auth/refresh` / `POST /auth/logout` / `GET /auth/me`

Unchanged.

## Players

### `POST /players/profile`
Create/update onboarding profile (Bearer token required).

### `PUT /players/profile/sports`
Set 1–10 favourite sports; marks onboarding complete.

### `POST /players/profile/notifications`
Record notification opt-in.

### `GET /players/profile`
Fetch profile + favourite sports.

### `GET /sports`
List sports catalog.

## OTP policy
- Hashed (bcrypt)
- Expiry: 5 minutes
- Max attempts: 5
- Resend cooldown: 60 seconds
- Max 3 OTP requests / phone / hour
- Provider: Twilio when `OTP_MODE=twilio` + Twilio env vars; otherwise mock logs to API console

## Env
```
OTP_MODE=mock|twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
# or TWILIO_MESSAGING_SERVICE_SID=
```
