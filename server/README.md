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

## Private AI for Progress Reports

The optional report assistant uses a self-hosted model that exposes an OpenAI-compatible chat-completions API. Configure these backend environment variables:

```env
PROGRESS_REPORT_AI_BASE_URL=http://127.0.0.1:11434/v1
PROGRESS_REPORT_AI_MODEL=your-local-model
PROGRESS_REPORT_AI_API_KEY=
```

For Docker Compose, set `PROGRESS_REPORT_AI_BASE_URL` to an endpoint reachable from the backend container (for example, an Ollama service on the same private Docker network or `http://host.docker.internal:11434/v1` when the model runs on the Docker host). The model name must match the server's installed model. Leave the URL and model unset to keep the assistant unavailable. Restart the backend after changing these settings.

The assistant converts a prompt into a validated report category, beneficiary type, and allowed fields. It does not receive school/group/batch identifiers or beneficiary records, and it cannot change the user's scope. AI summaries receive only report totals and aggregate progress counts. Every report query continues to use the authenticated user's existing authorization and scope.

Run the model endpoint inside a trusted private network. Do not expose it publicly; configure a key if the endpoint supports authentication. Users should avoid putting identifying details in prompts. AI output is descriptive only and is not clinical advice.

The server will create a simple `users` table on first run if it doesn't exist.
