# FitOra API — Postman

Files in this folder:

| File                                    | Purpose                                                           |
| --------------------------------------- | ----------------------------------------------------------------- |
| `fitora-api.postman_collection.json`    | All 422 API requests, grouped into 31 folders by module           |
| `fitora-local.postman_environment.json` | Local dev environment (`baseUrl`, seeded test credentials)        |
| `fitora-openapi.json`                   | Raw OpenAPI 3 spec exported from the running API                  |
| `postprocess.mjs`                       | Script that adds auth + token capture to the generated collection |

## Import into Postman

1. Postman → **Import** → drop in `fitora-api.postman_collection.json` and
   `fitora-local.postman_environment.json`.
2. Select the **FitOra Local** environment (top-right dropdown).
3. Open **auth → Login with email and password** and hit **Send**.
   The test script automatically saves `accessToken` / `refreshToken`, and every
   other request inherits the Bearer token from collection auth.
4. Call any endpoint. To switch roles, change the login body to
   `{{ownerEmail}}` / `{{ownerPassword}}` (or admin / trainer) and log in again.

Seeded credentials (from `pnpm db:seed`): admin, owner, player, trainer —
all stored as environment variables.

## Regenerating after API changes

The API must be running locally with `SWAGGER_ENABLED=true`:

```bash
curl -s http://localhost:3001/api/docs-json -o docs/postman/fitora-openapi.json
npx -y openapi-to-postmanv2 -s docs/postman/fitora-openapi.json \
  -o docs/postman/fitora-api.postman_collection.json -p \
  -O folderStrategy=Tags,requestParametersResolution=Example,includeAuthInfoInExample=false
node docs/postman/postprocess.mjs   # run exactly once per regeneration
```

Live Swagger UI is also available at http://localhost:3001/api/docs while the
API is running.
