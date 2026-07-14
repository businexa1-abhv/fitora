# FitOra Postman Setup

## 1. Start the API with Swagger enabled

From the repo root:

```bash
SWAGGER_ENABLED=true pnpm dev:api
```

API base URL:

```text
http://localhost:3001/api/v1
```

Swagger UI:

```text
http://localhost:3001/api/docs
```

OpenAPI JSON for Postman import:

```text
http://localhost:3001/api/docs-json
```

If port `3001` is busy, stop the old API process first:

```bash
lsof -nP -iTCP:3001 -sTCP:LISTEN
kill <PID>
```

## 2. Seed test accounts

If these accounts do not exist yet, run:

```bash
pnpm --filter @fitora/api db:seed
```

Seed users:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@fitora.com` | `AdminPass123!` |
| Court owner | `owner@fitora.com` | `OwnerPass123!` |
| Player | `player@fitora.com` | `PlayerPass123!` |
| Trainer | `trainer@fitora.com` | `TrainerPass123!` |
| Printer | `printer@fitora.com` | `PrinterPass123!` |
| Service provider | `provider@fitora.com` | `ProviderPass123!` |

## 3. Import APIs into Postman

In Postman:

1. Click **Import**.
2. Select **Link**.
3. Paste `http://localhost:3001/api/docs-json`.
4. Import as an OpenAPI collection.
5. Import `docs/postman/FitOra.local.postman_environment.json` as an environment.
6. Select the `FitOra Local` environment.

## 4. Login and save tokens

Create or open this request:

```http
POST {{baseUrl}}/auth/login
Content-Type: application/json
```

Body:

```json
{
  "email": "admin@fitora.com",
  "password": "AdminPass123!"
}
```

Postman **Tests** script:

```javascript
const data = pm.response.json();

pm.environment.set('accessToken', data.tokens.accessToken);
pm.environment.set('refreshToken', data.tokens.refreshToken);
pm.environment.set('userId', data.user.id);
pm.environment.set('email', data.user.email);
pm.environment.set('roles', data.user.roles.join(','));
```

For protected routes, set collection authorization to:

```text
Type: Bearer Token
Token: {{accessToken}}
```

## 5. Useful headers

Most requests need:

```text
Authorization: Bearer {{accessToken}}
Content-Type: application/json
```

Tenant-scoped requests can also use one of:

```text
X-Tenant-Slug: platform
X-Tenant-Id: <tenant id>
```

To find your tenant after login:

```http
GET {{baseUrl}}/tenants/me
Authorization: Bearer {{accessToken}}
```

## 6. Quick smoke tests

Public endpoints:

```http
GET {{baseUrl}}/health
GET {{baseUrl}}/health/ready
GET {{baseUrl}}/courts
GET {{baseUrl}}/shop/categories
GET {{baseUrl}}/shop/products
GET {{baseUrl}}/services/categories
GET {{baseUrl}}/training/age-groups
GET {{baseUrl}}/payments/config
```

Authenticated checks:

```http
GET {{baseUrl}}/auth/me
GET {{baseUrl}}/auth/permissions
GET {{baseUrl}}/notifications/unread-count
GET {{baseUrl}}/wallet
GET {{baseUrl}}/bookings/my
GET {{baseUrl}}/payments/my
```

Role-specific checks:

```http
GET {{baseUrl}}/analytics/dashboard          # Admin
GET {{baseUrl}}/analytics/owner/dashboard    # Owner
GET {{baseUrl}}/training/dashboard/trainer   # Trainer
GET {{baseUrl}}/services/dashboard/provider  # Service provider
GET {{baseUrl}}/print/dashboard/printer      # Printer
```

## 7. Refresh token request

```http
POST {{baseUrl}}/auth/refresh
Content-Type: application/json
```

Body:

```json
{
  "refreshToken": "{{refreshToken}}"
}
```
