# Integrated AI: Modules, Purpose, Scope, and Limits

**Reviewed:** 2026-10-19

## Overview

F1KD has optional AI features that use one administrator-configured, OpenAI-compatible chat-completions endpoint. The AI helps interpret report requests and summarize aggregate dashboard figures; it is not the system of record. The application keeps applying its normal authentication, authorization, and data-selection rules, and users remain responsible for reviewing AI suggestions.

AI is disabled unless both `PROGRESS_REPORT_AI_BASE_URL` and `PROGRESS_REPORT_AI_MODEL` are configured for the backend. The server sends requests to `{PROGRESS_REPORT_AI_BASE_URL}/chat/completions`; it adds a bearer token when `PROGRESS_REPORT_AI_API_KEY` is set. The endpoint must be reachable from the backend process. For Docker, use an address reachable from the API container. See [server/.env.example](../server/.env.example) and [server/README.md](../server/README.md).

The status endpoint reports whether a URL and model are configured; it does not test whether the model endpoint is healthy. Requests time out after 120 seconds. AI calls can fail if the endpoint is unavailable, the model does not support the requested response format, or its response fails server validation. Leaving the URL or model unset keeps the AI unavailable without disabling non-AI workflows.

## Module-by-module guide

| Module / feature | Access | Purpose and current availability | Scope and data flow | Limits |
|---|---|---|---|---|
| **Dashboard insights** | Super Admin, Admin, Partner, Community Coordinator, Health Worker | Visible on the Dashboard when AI is configured. Summarizes dashboard totals and answers questions about those totals. | Sends the user's optional question and validated aggregate counts only. Counts are limited to supported dashboard totals such as mother/child and beneficiary counts, follow-ups, community structures, programs, and staff status totals. | Does not receive individual records, explain causes, identify people, or provide clinical guidance. It is limited to supplied counts and short answers; do not enter names, IDs, contact details, or individual health information in questions. |
| **Progress Report AI report builder** | Admin, Partner, Community Coordinator, Health Worker | Visible in Progress Report. Translates a natural-language request into report settings and can ask one clarification question. The user reviews and applies the proposed settings. | Sends the prompt and generic instructions/catalogs of available report types and fields. It does not send beneficiary data or select the user's school, group, or batch. The application loads report rows under the user's existing scope after settings are applied. | Supports profile, monitoring, and program report categories for mothers or children, with field limits enforced by the server. It proposes settings only; it does not generate, save, export, or select a program on the user's behalf. Ambiguous requests may need clarification. |
| **Monitoring check-up report assistant** | Super Admin, Admin, Partner, Community Coordinator, Health Worker | Visible in Monitoring. Turns a request into a set of fields and optional filters for viewing saved check-ups. | Sends the prompt and the chosen beneficiary type. The UI removes known beneficiary names from the prompt before sending. The application locally selects already-authorized beneficiaries and check-ups, then builds the report; names, identifiers, and check-up rows are not sent to the model. | Uses only fields allowed for Mother or Child reports. Filters for latest check-up, recorded hospital referral (mother only), and saved non-normal developmental screening are applied to local records. It cannot diagnose, infer missing values, recommend treatment, or choose beneficiaries. Avoid including any identifiers not automatically removed by the UI. |

## Access and safeguards

- AI routes require authentication and are subject to the same operational role rules as their associated modules.
- AI responses are constrained to known field, filter, and intent values and validated by the server before use. This constrains output shape; it does not make model output inherently correct.
- The application's normal authorization and scope checks still control which records can be selected. AI cannot widen a user's school/group scope.
- AI output is advisory and may be inaccurate, incomplete, or unsuitable. Verify proposed settings and results against the records and applicable policies.
- The configured endpoint receives the prompt and other inputs listed above. Use a trusted private endpoint, configure its API key if supported, and review that provider's retention and processing practices. Do not expose the model endpoint publicly.
- None of these assistants should be used for clinical decisions, diagnoses, treatment decisions, or emergency guidance.

## API route inventory

These routes are mounted under `/api/progress-report`:

| Route | Capability |
|---|---|
| `GET /ai/status` | Reports whether AI URL/model configuration is present. |
| `POST /ai/dashboard-insight` | Dashboard aggregate summary or question. |
| `POST /ai/proposal` | Progress Report settings proposal. |
| `POST /ai/monitoring-report` | Monitoring check-up report fields and filters. |
