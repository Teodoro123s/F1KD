# F1KD AI Reporting Assistant

## Overview

F1KD's AI features are optional and use one provider configuration for all signed-in users. The provider endpoint, model, and API key are configured only in the backend environment; users cannot add personal keys or change provider settings in the app.

The **AI Assistant** action on the Dashboard opens a read-only reporting assistant. The Progress Report also includes an AI report builder. Together, they help prepare authorized mother/child profile, monitoring, and project-benefit reports, and provide Superadmin insights from aggregate module counts. Report rows are retrieved separately through F1KD's existing role-scoped reporting APIs.

AI output is advisory. It is not a source of truth, a clinical assessment, or authorization to change data.

## Configure the shared provider

Set these variables in the repository-root `.env` for Docker Compose or in `server/.env` for a direct backend deployment:

```env
PROGRESS_REPORT_AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
PROGRESS_REPORT_AI_MODEL=gemini-3.1-flash-lite
PROGRESS_REPORT_AI_API_KEY=<server-side provider API key>
```

The server appends `/chat/completions` to the base URL. Use a trusted HTTPS endpoint implementing OpenAI-compatible chat completions. Never place the API key in frontend variables, source code, URLs, screenshots, or logs. Restart or recreate the backend after changing the environment.

The defaults use Google's Gemini endpoint. `PROGRESS_REPORT_AI_MODEL` can be set to another model enabled for the configured provider account. See [Google AI's model list](https://ai.google.dev/gemini-api/docs/models) before switching. All users share the provider account's quota and billing.

## Assistant behavior and data handling

- The signed-in user's school/group scope is enforced by F1KD's reporting backend. The assistant does not accept scope IDs as authorization.
- The natural-language prompt and generic report-field catalog are sent to the configured provider to create a report proposal. Beneficiary rows, database credentials, and authorization scope are not sent to the model.
- The app loads report rows separately from F1KD and renders a preview of up to 20 rows. CSV export includes all matching authorized rows.
- Superadmin insights send only aggregate counts from successfully loaded User Management, Community, Reports, and Notifications modules. Individual user details and beneficiary records are not sent.
- Client and server checks block prompts matching heuristics for email addresses, Philippine mobile numbers, explicitly labeled names, and common labeled/structured record IDs. These checks are best-effort, may miss personal data or flag ordinary text, and are not a substitute for avoiding sensitive details.
- Only fixed, application-defined controls are rendered. Model output cannot create arbitrary UI or executable actions.
- The assistant is read-only. Requests recognized as asking to create, update, delete, or run database/shell commands are rejected by the request policy. Data retrieval uses existing read-only report APIs; no AI endpoint writes operational records.
- AI output and field selections are not calculated results or clinical advice. Report values come from the existing F1KD reporting services.

The assistant does not provide Excel/XLSX downloads, AI-generated charts, or model-written analyses of beneficiary rows.

## Access, limits, and troubleshooting

The assistant endpoints require authentication and operational-role authorization. Health Workers remain assigned-group scoped, Community Coordinators remain assigned-school scoped, and global read-only roles retain their existing reporting access.

The AI status response exposes only whether the shared configuration is ready and the public model name; it never returns the API key. AI report requests are rate-limited to 10 requests per minute per client IP. Provider report calls have a 120-second timeout, while the bundled Nginx configuration closes API requests after 60 seconds, so a slow request can receive a gateway timeout first.

- If the Dashboard says the AI service is not configured, ask the server administrator to set `PROGRESS_REPORT_AI_BASE_URL`, `PROGRESS_REPORT_AI_MODEL`, and `PROGRESS_REPORT_AI_API_KEY`.
- A provider 401 usually means the shared key was rejected. Confirm it belongs to the provider and has access to the configured model; rotate any exposed key.
- HTTP 429 indicates a provider or application rate limit. Wait before retrying; repeated provider limits may require the administrator to adjust the provider plan.
- A timeout can indicate provider latency, an unavailable model, network filtering, or a proxy timeout. Check backend health and sanitized logs; never log or share the key or authorization headers.
- `GET /api/health` checks application health, not provider connectivity.

## Relevant API routes

| Method and route | Purpose |
|---|---|
| `GET /api/progress-report/ai/status` | Read shared configuration readiness and model name; no key is returned. |
| `POST /api/progress-report/ai/proposal` | Create a validated report proposal using the shared server-side key. |
| `POST /api/progress-report/ai/dashboard-insight` | Generate an insight from supplied aggregate counts using the shared server-side key. |
| `POST /api/progress-report/ai/monitoring-report` | Create a monitoring-report intent using the shared server-side key. |
| Existing `/api/progress-report` read routes | Return report options and role-scoped operational rows to the application. |

The obsolete per-user encrypted-key table is removed by [`server/migrations/20261116_drop_user_ai_configurations.sql`](../server/migrations/20261116_drop_user_ai_configurations.sql). The backend no longer creates or reads per-user AI credentials.
