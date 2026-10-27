# Integrated AI: Modules, Purpose, Scope, and Limits

**Reviewed:** 2026-10-27

## Overview

F1KD has optional AI features that use Groq's OpenAI-compatible cloud chat-completions endpoint. The AI helps interpret report requests and summarize aggregate dashboard figures; it is not the system of record. The application keeps applying its normal authentication, authorization, and data-selection rules, and users remain responsible for reviewing AI suggestions.

AI is disabled unless both `PROGRESS_REPORT_AI_BASE_URL` and `PROGRESS_REPORT_AI_MODEL` are configured for the backend. The Groq deployment uses `https://api.groq.com/openai/v1`, the `openai/gpt-oss-20b` model, and a `PROGRESS_REPORT_AI_API_KEY` bearer token. The server sends requests to `{PROGRESS_REPORT_AI_BASE_URL}/chat/completions`. Store the key only in the root `.env` file used by Docker Compose. See [server/README.md](../server/README.md).

The status endpoint reports whether a URL and model are configured; it does not test whether the model endpoint is healthy. Requests time out after 120 seconds. AI calls can fail if the endpoint is unavailable, the model does not support the requested response format, or its response fails server validation. Leaving the URL or model unset keeps the AI unavailable without disabling non-AI workflows.

## Module-by-module guide

| Module / feature | Access | Purpose and current availability | Scope and data flow | Limits |
|---|---|---|---|---|
| **Dashboard insights** | Super Admin, Admin, Partner, Community Coordinator, Health Worker | Visible on the Dashboard when AI is configured. Summarizes dashboard totals and answers questions about those totals. | Sends the user's optional question and validated aggregate counts only. Counts are limited to supported dashboard totals such as mother/child and beneficiary counts, follow-ups, community structures, projects, and staff status totals. | Does not receive individual records or child measurements, z-scores, or growth interpretations. It cannot assess a child's growth from totals, explain causes, identify people, or provide clinical guidance. Do not enter names, IDs, contact details, or individual health information in questions. |
| **Progress Report AI report builder** | Admin, Partner, Community Coordinator, Health Worker | Visible in Progress Report as one builder with Progress/Profile/Project and Check-up report modes. Translates natural-language requests, can ask one clarification question in the standard report mode, previews results, and supports CSV downloads. | The prompt is sent without known beneficiary names or recognized scope names. The model receives generic report instructions and field catalogs, not beneficiary data, IDs, check-up rows, or the user's scope. The application loads records through authenticated APIs and applies the current school, group, and batch selection plus the user's authorization scope. | Supports profile, monitoring, and project report categories for mothers or children. Check-up reports can select maternal and child check-up fields, filter developmental screening statuses (Normal, Needs Follow-up, At Risk), mother hospital referrals, first/latest check-ups, current month, and recognized community/school/group/batch names. Mother fields include check-up date, gestational age/month, weight, height, blood pressure, BMI/status, developmental screening, provider, next check-up date, referral, lab requests, assistance amount, source of funds, facility, fundal height, fetal heart rate, and remarks. Child fields include check-up/next dates, age, feeding method, weight, height, Weight-for-Age, Length-for-Age, Weight-for-Length, developmental screening, provider, and remarks. Child growth interpretations are calculated locally from saved measurements; the model does not receive those measurements. Child BMI is not a check-up field and is neither calculated nor substituted for a growth indicator. The assistant cannot diagnose, infer missing values, recommend treatment, or choose beneficiaries. Check-up prompts are limited to 500 characters. |

## Access and safeguards

- AI routes require authentication and are subject to the same operational role rules as their associated modules.
- AI responses are constrained to known field, filter, and intent values and validated by the server before use. This constrains output shape; it does not make model output inherently correct.
- The application's normal authorization and scope checks still control which records can be selected. AI cannot widen a user's school/group scope.
- AI models do not calculate or diagnose child growth. The application derives WHO screening outputs locally from authorized saved check-up measurements; review the source records and consult a qualified health worker for clinical interpretation.
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
| `POST /ai/monitoring-report` | Check-up report fields and filters used by the Progress Report builder. |
