# Integrated AI: Modules, Purpose, Scope, and Limits

**Reviewed:** 2026-10-26

## Overview

F1KD has optional AI features that use Groq's OpenAI-compatible cloud chat-completions endpoint. The AI helps interpret report requests and summarize aggregate dashboard figures; it is not the system of record. The application keeps applying its normal authentication, authorization, and data-selection rules, and users remain responsible for reviewing AI suggestions.

AI is disabled unless both `PROGRESS_REPORT_AI_BASE_URL` and `PROGRESS_REPORT_AI_MODEL` are configured for the backend. The Groq deployment uses `https://api.groq.com/openai/v1`, the `openai/gpt-oss-20b` model, and a `PROGRESS_REPORT_AI_API_KEY` bearer token. The server sends requests to `{PROGRESS_REPORT_AI_BASE_URL}/chat/completions`. Store the key only in the root `.env` file used by Docker Compose. See [server/README.md](../server/README.md).

The status endpoint reports whether a URL and model are configured; it does not test whether the model endpoint is healthy. Requests time out after 120 seconds. AI calls can fail if the endpoint is unavailable, the model does not support the requested response format, or its response fails server validation. Leaving the URL or model unset keeps the AI unavailable without disabling non-AI workflows.

## Module-by-module guide

| Module / feature | Access | Purpose and current availability | Scope and data flow | Limits |
|---|---|---|---|---|
| **Dashboard insights** | Super Admin, Admin, Partner, Community Coordinator, Health Worker | Visible on the Dashboard when AI is configured. Summarizes dashboard totals and answers questions about those totals. | Sends the user's optional question and validated aggregate counts only. Counts are limited to supported dashboard totals such as mother/child and beneficiary counts, follow-ups, community structures, programs, and staff status totals. | Does not receive individual records, explain causes, identify people, or provide clinical guidance. It is limited to supplied counts and short answers; do not enter names, IDs, contact details, or individual health information in questions. |
| **Progress Report AI report builder** | Admin, Partner, Community Coordinator, Health Worker | Visible in Progress Report. Translates a natural-language request into report settings and can ask one clarification question. The user reviews and applies the proposed settings. | Sends the prompt and generic instructions/catalogs of available report types and fields. It does not send beneficiary data or select the user's school, group, or batch. The application loads report rows under the user's existing scope after settings are applied. | Supports profile, monitoring, and program report categories for mothers or children, with field limits enforced by the server. It proposes settings only; it does not generate, save, export, or select a program on the user's behalf. Ambiguous requests may need clarification. |
| **Monitoring check-up report assistant** | Admin, Partner, Community Coordinator, Health Worker | Visible in Monitoring. Maps recognizable field and filter requests locally; sends less explicit requests to the configured model for interpretation. It builds a table of saved check-ups and can download CSV. (Super Admin is denied access under operational module restrictions.) | The UI removes known beneficiary names from the prompt before sending it to the model. Beneficiary selection, authorization scope, check-up filtering, and table construction stay in the application; names, IDs, and check-up rows are not sent to the model. | Mother reports can select check-up date, gestational age/month, weight, height, blood pressure, BMI/status, developmental screening, provider, next check-up date, referral, lab requests, assistance amount, source of funds, facility, fundal height, fetal heart rate, and remarks. Child reports can select check-up/next dates, age, breastfeeding status, weight, length, BMI, all three WHO growth interpretations, developmental screening, provider, and notes. It can filter recorded Normal, Needs Follow-up, or At Risk developmental screening statuses; recorded hospital referral (mother only); and latest saved check-up. For latest-only reports, filters are applied to each beneficiary's latest saved check-up. It cannot diagnose, infer missing values, recommend treatment, or choose beneficiaries. Prompts are limited to 500 characters. Avoid adding identifiers that the UI cannot recognize and remove. |

## Access and safeguards

- AI routes require authentication and are subject to the same operational role rules as their associated modules.
- AI responses are constrained to known field, filter, and intent values and validated by the server before use. This constrains output shape; it does not make model output inherently correct.
- The application's normal authorization and scope checks still control which records can be selected. AI cannot widen a user's school/group scope.
- AI output is advisory and may be inaccurate, incomplete, or unsuitable. Verify proposed settings and results against the records and applicable policies.
- Groq receives the prompt and other inputs listed above. Keep its API key server-side, review Groq's retention and processing practices, and do not send beneficiary identifiers or check-up data to the model.
- None of these assistants should be used for clinical decisions, diagnoses, treatment decisions, or emergency guidance.

## API route inventory

These routes are mounted under `/api/progress-report`:

| Route | Capability |
|---|---|
| `GET /ai/status` | Reports whether AI URL/model configuration is present. |
| `POST /ai/dashboard-insight` | Dashboard aggregate summary or question. |
| `POST /ai/proposal` | Progress Report settings proposal. |
| `POST /ai/monitoring-report` | Monitoring check-up report fields and filters. |
