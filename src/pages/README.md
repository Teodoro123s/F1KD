# Page and feature folders

Page code is grouped by product feature. Add a new screen to the owning feature
folder, and keep feature-specific components, hooks, and utilities alongside it.

- `Auth/` - sign-in and password recovery.
- `Beneficiary/` - mother and child records, profiles, and care workflows.
- `Community/` - schools, groups, batches, and community administration.
- `Dashboard/` and `ProgressReport/` - summary and detailed progress reporting.
- `Reports/` - login reporting; `components/` holds chart, filter, and table UI, `hooks/` owns report state/data, `utils/` handles formatting/export, and `styles/` contains report styles.
- `Monitoring/` - maternal and child monitoring workflows; `utils/` holds monitoring-specific helpers and their tests.
- `Program/` - page files coordinate the feature; `components/` holds focused dialogs, tables, and calendars, `hooks/` owns page data or workflow state, and `utils/` holds pure feature helpers with their tests.
- `UserManagement/` - user administration and detail views.
- `Profile/` - account profile; `components/` contains display/edit UI and `hooks/` separates profile editing from assignment-label lookup.
- `Settings/` and `Notifications/` - other signed-in account features.
- `Errors/` - error and not-found screens.

Route-level role access is declared in `src/App.jsx`. UI capability checks and
role normalization live in `src/utils/permissions.js`; route guards improve the
client experience but do not replace authorization in the server API.
