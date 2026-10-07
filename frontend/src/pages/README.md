# Page organization

Role-specific page entry points are grouped under `roles/`:

- `roles/super_admin/`: Dashboard, Community, Beneficiary, Monitoring, Notifications, Program, Progress Report, and User Management
- `roles/admin/`: Dashboard, Community, Beneficiary, Monitoring, Notifications, and Program
- `roles/community_coordinator/`: Dashboard, Community, Beneficiary, Monitoring, Notifications, and Progress Report
- `roles/partner/`: Dashboard, Notifications, Program, and Progress Report
- `roles/health_worker/`: Dashboard, Beneficiary, Monitoring, and Notifications

Each role folder contains its own copy of the code for its listed modules, so
modules can be changed for one role without changing another role's implementation.
`RoleModulePage.jsx` selects the signed-in role's module, and
`utils/permissions.js` plus backend authorization middleware enforce access.

Role-specific business components, state contexts, utilities, and cross-module
dependencies are isolated under each role's `_shared/` folder. Role modules
should import from their own role tree, not another role or `pages/shared/`.
Only API, authentication/authorization, design-system, and global style
infrastructure remains common. `RoleMothersProvider` selects the matching
role-local data context for the active session.
