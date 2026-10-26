# Project structure

This repository uses feature-oriented folders within a small number of stable application layers. Keep files close to the feature that owns their behavior; use the shared folders only for code used by multiple features.

## Frontend

```text
src/
  api/                 HTTP clients grouped by backend resource
  assets/              Images and other static assets
  auth/                Authentication state and session helpers
  components/           Shared application and UI components
    ui/                 Reusable controls, dialogs, tables, and display states
  context/              Cross-page React state providers
  pages/                Route-level features and feature-owned modules
  styles/               Global tokens and shared component styles
  utils/                Cross-feature helpers grouped by concern
    analytics/          Shared reporting and time-series helpers
    beneficiary/        Child and maternal domain rules
    formatting/         Shared date and name formatting
    navigation/         Shared navigation helpers and hooks
    validation/         Cross-feature input validation
    permissions.js      Shared client-side permission helpers
```

### Feature folders

Most `src/pages/<Feature>/` directories contain the route page plus feature-specific components, hooks, and utilities. For example, Progress Report owns its `components/`, `hooks/`, and `utils/` folders. Keep feature-specific code there instead of adding it to the global shared directories.

Beneficiary workflows have two canonical implementation folders:

```text
src/pages/Beneficiary/
  BeneficiaryPage.jsx       Route-level beneficiary page
  BeneficiaryListPage.jsx   Beneficiary list and selection
  BeneficiaryTable.jsx      Shared beneficiary table
  components/               Beneficiary-only presentation components
  hooks/                    Beneficiary-only state and interaction hooks
  utils/                    Beneficiary-only data helpers
  child/                    Child creation, profile, edit, and history flows
  mother/                   Mother creation, profile, edit, monitoring, and claims
```

Some same-named files directly under `Beneficiary/` are compatibility re-exports of the implementations in `child/` or `mother/`. Keep these as thin exports for existing import paths. Put new behavior in the canonical `child/` or `mother/` module, and use that canonical path for new imports.

## Backend

```text
server/
  routes/        HTTP endpoints and request-level orchestration
  services/      Reusable business operations
  middleware/    Authentication, authorization, and request middleware
  utils/         Server-only validation and shared helpers
  migrations/    Database schema changes
  data/          Local runtime data and uploads
  test/          Backend and integration tests
```

Keep frontend API clients in `src/api/`; keep server endpoints in `server/routes/`. A client should not import server modules, and server files should not reach into `src/`.

## Placement rules

- Add route composition to `src/App.jsx`; keep route-specific UI and state in its feature folder.
- Put reusable controls in `src/components/ui/` only when at least two independent features use them.
- Put feature-only components, hooks, and helpers beside that feature.
- Keep cross-feature, framework-independent helpers in the matching `src/utils/` concern folder; keep server-only helpers in `server/utils/`.
- Keep shared visual tokens and global styles in `src/styles/`. Feature-specific layout rules should use feature-prefixed class names.
- Preserve compatibility re-exports when moving implementations. Update all internal imports in the same change and run the production build.
- Avoid broad file moves mixed with behavior changes. Move one feature area at a time so import and route regressions are easy to trace.
