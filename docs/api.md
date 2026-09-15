# API Contract

Base path: `/api/v1`

## Health
`GET /health` — process health  
`GET /ready` — dependency readiness

## Analyses
`POST /analyses`

```json
{
  "repositoryId": "repo_123",
  "branch": "main"
}
```

The API returns `202 Accepted` when a background analysis has been queued. Production adapters should attach an authenticated workspace context and idempotency key.
