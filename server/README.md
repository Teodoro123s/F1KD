# Backend (Express + MySQL)

Quick setup:

```bash
cd server
npm install
cp .env.example .env
# edit .env to set DB_* variables
npm run dev
```

Available endpoints:
- `GET /api/health` — health check
- `GET /api/users` — list users
- `POST /api/users` — create user `{ "name": "...", "email": "..." }`
- `GET /api/mothers/:id/claims` — list internally tracked PhilHealth claim records
- `POST /api/mothers/:id/claims` — create a claim record (Community Coordinator or Health Worker)
- `PUT /api/mothers/:id/claims/:claimId` — update a claim record (Community Coordinator or Health Worker)

Claim records track a reference, date, status, amount, and notes; they do not submit claims to PhilHealth.

## Private AI assistants

Optional AI features use a backend-configured OpenAI-compatible chat-completions API. Configure:

```env
PROGRESS_REPORT_AI_BASE_URL=http://127.0.0.1:11434/v1
PROGRESS_REPORT_AI_MODEL=your-local-model
PROGRESS_REPORT_AI_API_KEY=
```

For Docker Compose, set `PROGRESS_REPORT_AI_BASE_URL` to an endpoint reachable from the backend container (for example, an Ollama service on the same private Docker network or `http://host.docker.internal:11434/v1` when the model runs on the Docker host). The model name must match the server's installed model. The server appends `/chat/completions` to the base URL. Leave the URL and model unset to keep AI unavailable. Restart the backend after changing these settings.

For module-by-module capabilities, role access, inputs sent to the model, and limitations—including endpoints that are not wired to a screen—see [Integrated AI: Modules, Purpose, Scope, and Limits](../docs/INTEGRATED_AI.md).

Keep the model endpoint on a trusted private network, configure a key if supported, and review its data retention practices. AI output is advisory only and is not clinical advice.

The server will create a simple `users` table on first run if it doesn't exist.
