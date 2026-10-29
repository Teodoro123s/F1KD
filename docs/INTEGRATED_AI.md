# F1KD AI Integration

## Overview

F1KD's AI features are optional. The current provider configuration uses Google's Gemini API through its OpenAI-compatible Chat Completions endpoint. Provider endpoint and model are controlled by the server; users do not choose either in the UI.

The AI Setting page is focused on provider configuration and connection status. A compact **AI Assistant** action in the page header opens the read-only reporting assistant in a right-side drawer without navigating away. The action is available before setup; the current saved-key status is checked when the drawer opens, and if no key has been saved, the drawer directs the user to configure one. The assistant presents a chat-style stream for user requests, assistant responses, clarification prompts, project controls, and report previews. It translates a natural-language request into an allowlisted report proposal; the user can choose authorized scope filters and, when needed, a project. The application—not the model—fetches records through the existing authenticated, role-scoped reporting APIs. The model does not receive beneficiary report rows.

AI output is advisory. It is not a source of truth, a clinical assessment, or authorization to change data.

## Configure the server

For Docker Compose, set these values in the repository-root `.env` file:

```env
PROGRESS_REPORT_AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
PROGRESS_REPORT_AI_MODEL=gemini-3.1-flash-lite
AI_SETTINGS_ENCRYPTION_KEY=<64 hexadecimal characters>
```

Generate a new encryption key locally:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

For a direct backend deployment, set the same variables in `server/.env`. The base URL must be a trusted HTTPS endpoint that implements OpenAI-compatible chat completions. The server appends `/chat/completions` to the base URL. Gemini's OpenAI compatibility and available models are documented by [Google AI](https://ai.google.dev/gemini-api/docs/openai) and [Google's model list](https://ai.google.dev/gemini-api/docs/models).

After changing Compose environment values, recreate the backend:

```powershell
docker compose -f docker-compose.minio.yml up -d --force-recreate backend
```

The encryption key must remain stable and backed up. If it is lost or rotated, previously stored user keys cannot be decrypted. Do not put provider keys in frontend environment variables, source code, URLs, or logs.

## User setup

1. Sign in and open **AI Setting**.
2. Check the read-only provider and model label.
3. Enter a Google AI Studio API key.
4. Select **Test Connection**. A successful provider response changes status to Connected.
5. Select **Save API Key**. To replace a saved key, test the replacement and choose **Update API Key**.
6. Select **AI Assistant** in the page header to open the drawer and submit reporting questions. Remove API Key deletes the saved credential for the signed-in user.

The test uses the configured model and a minimal request. It has a 25-second timeout. The interface hides the key when testing starts. Do not share screenshots with the key shown; revoke and replace a key if it is exposed.

If `AI_SETTINGS_ENCRYPTION_KEY` is missing or malformed, the page reports that secure storage is unavailable and prevents testing/saving. If the provider rejects the key, check that it is a Google Gemini API key, that the selected model is available to the Google AI project, and that provider access or quota is enabled.

## Credential storage and privacy

- Each API key is associated with the authenticated user's ID and encrypted in MariaDB using AES-256-GCM.
- The user ID is included as authenticated encryption data to prevent a stored ciphertext from being moved between accounts.
- Configuration responses contain only whether a key is configured, the public provider/model label, and the last test time. They never return the plaintext key, ciphertext, encryption IV, or authentication tag.
- Keys are tested server-side before a new or replacement credential is stored. A failed test does not save that key.
- The user key is sent to Google in the server-to-provider `Authorization` header. Keep the provider's key handling and data-retention policies in mind.
- The natural-language report request and generic field/intent catalog are sent to Gemini to produce a report proposal. The application does not send the user's authorization scope or the report's beneficiary rows to the model.
- The browser receives authorized report rows from F1KD's own API to render the preview and generate the CSV. Those rows remain in the application flow and are not included in the AI proposal request.
- Users are instructed not to include names, beneficiary IDs, contact details, or other identifying information in prompts. Client and server checks block prompts matching heuristics for email addresses, Philippine mobile numbers, explicitly labeled names, and common labeled/structured record IDs before the prompt reaches the provider. These checks are best-effort: they can miss personal data or flag ordinary text, and they are not a substitute for avoiding sensitive details.

## Assistant capabilities and limitations

The AI Setting page contains the provider configuration card and a brief privacy note; it does not show separate AI Usage and Limits or AI Reporting Assistant cards. The drawer remains available without a saved key and explains that setup is required before reports can be generated.

The AI Setting drawer currently supports this conversational flow:

- The user submits a natural-language reporting request in the chat composer.
- The model proposes an allowlisted beneficiary profile, monitoring/check-up, or project-benefit report for mothers or children.
- If the request is ambiguous, the assistant adds a clarification prompt and response control to the conversation; the clarified request is submitted for another proposal.
- The signed-in user's school/group scope is applied by the backend, without group or batch selector controls. A community selector remains available for roles that can choose among accessible communities. A project selector and report action are rendered in the assistant's message when a project-benefit report requires a project.
- The application retrieves authorized rows and displays the report type, total record count, and a preview of up to 20 rows in the conversation. CSV export includes all matching authorized rows.

Only fixed, application-defined controls are rendered; model output cannot create arbitrary UI or executable actions. For project reports, the user selects an eligible project from the authorized project list before the application builds the report. The natural-language request determines report intent and supported report filters; the backend independently enforces the signed-in user's school/group scope, and request text cannot grant additional access. Health Workers remain assigned-group scoped, and Community Coordinators remain assigned-school scoped.

The drawer currently does **not** provide Excel/XLSX downloads, AI-generated charts, or model-written analyses of the underlying beneficiary rows. Do not interpret a model's explanation or proposed fields as calculated results. Report values come from the existing F1KD reporting services.

The reporting assistant is read-only. Requests recognized as asking to create, update, delete, or run database/shell commands are rejected by the AI request policy. Data retrieval uses existing read-only report APIs; no AI endpoint writes operational records. The request policy is pattern-based and is not a general-purpose safeguard against every possible phrasing.

The Dashboard Insights component and older Progress Report AI API helpers may exist in the source tree, but the AI Setting drawer is the current per-user-key workflow documented here. Do not assume unused legacy helpers use a user's saved key.

## Authorization, limits, and troubleshooting

- AI Setting endpoints use the existing authentication and operational-role middleware. Configuration is per signed-in user.
- Report access uses existing Progress Report authorization and scope enforcement. AI intent output is validated against supported report types and fields before use.
- AI configuration POST/PUT requests and report-proposal requests are rate-limited to 10 requests per minute per client IP, in addition to the general API limit. Read and delete configuration requests do not use that AI-specific limiter.
- Key connection tests time out after 25 seconds. Report AI calls have their own longer request timeout. A slow provider can fail even when the application is healthy.
- The report AI request timeout is 120 seconds, but the bundled Nginx configuration closes API requests after 60 seconds. A slow report proposal can therefore return a gateway timeout before the backend's provider request times out.
- A 401 from the provider usually means it rejected the key. A 401 from F1KD indicates an authentication/session problem; an F1KD 403 indicates an authorization problem. Confirm the key is from the provider shown on the settings page and replace any exposed key.
- HTTP 429 indicates the provider or application rate limit was reached; wait before retrying.
- A timeout can indicate provider latency, an unavailable model, network filtering, or a proxy timeout. Check backend health and sanitized server logs; never log or share the key or full authorization headers.
- `GET /api/health` checks application health, not AI-provider connectivity. Use **Test Connection** for a provider check.

## Relevant API routes

The current AI Setting and drawer workflow uses:

| Method and route | Purpose |
|---|---|
| `GET /api/ai-settings/configuration` | Read configuration status and public provider/model label; no key is returned. |
| `POST /api/ai-settings/test` | Test a newly entered key, or test a saved key when explicitly requested by an authorized client. |
| `PUT /api/ai-settings/configuration` | Validate and encrypt the signed-in user's key, then save it. |
| `DELETE /api/ai-settings/configuration` | Remove the signed-in user's saved key. |
| `POST /api/ai-settings/proposal` | Reject prompts matching the server's potential-PII patterns, then turn the request into a validated report proposal using that user's saved key. Called again when the user answers an assistant clarification. |
| Existing `/api/progress-report` read routes | Return report options and role-scoped operational rows to the application. |

These routes require authentication and operational authorization. The model does not receive database credentials or execute SQL.
