# RBAC Implementation

## Roles

The application uses exactly three canonical roles:

- `super_admin`
- `admin`
- `partner`

Legacy values such as `Superadmin`, `Super Admin`, and `Community Organizer` are normalized at the authorization boundary for compatibility with existing accounts.

## Permission Matrix

```json
{
  "user-management": {
    "read": ["super_admin"],
    "create": ["super_admin"],
    "update": ["super_admin"],
    "delete": ["super_admin"]
  },
  "admin-resources": {
    "read": ["super_admin", "admin"],
    "create": ["super_admin"],
    "update": ["super_admin"],
    "delete": ["super_admin"]
  },
  "partner-resources": {
    "read": ["super_admin", "partner"],
    "create": ["super_admin"],
    "update": ["super_admin"],
    "delete": ["super_admin"]
  }
}
```

The source configuration is `src/utils/permissions.js`.

## Frontend Enforcement

- `RequireAuth` blocks unauthenticated pages.
- `RoleBasedRoute` redirects non-`super_admin` users from User Management routes.
- Sidebar hides the User Management link unless the current role is `super_admin`.
- Create/edit controls are hidden for `admin` and `partner` users.
- `can(role, resource, action)` is the shared UI permission check.

## Backend Enforcement

- `verifyToken` authenticates every community, mother, and child API request.
- `authorize('super_admin')` protects every User Management endpoint except the authenticated coordinator list read.
- `authorizeOperational` allows operational `GET` requests but rejects every non-GET request unless the role is `super_admin`.
- Frontend bearer tokens are attached by the shared API helpers.

UI restrictions are not sufficient by themselves because users can call APIs directly or manually enter URLs. API authorization is the security boundary; UI restrictions provide correct navigation and prevent confusing actions for read-only users.

## Database Setup

Run these files in order:

1. `server/migrations/20260904_rbac.sql`
2. `server/seeds/seed_rbac.sql`

The migration creates `roles`, `permissions`, and `role_permissions`, seeds the exact matrix, and normalizes legacy role names in `users`.

## Verification

Run:

```powershell
npm run build
Push-Location server
node --check index.js
node --check middleware/authorize.js
node --check routes/users.js
Pop-Location
```

## Scope Note

School-level row filtering is not enabled yet because the current user model has no `school_id` or user-to-school assignment relation. Add that relationship, include it in the signed token, and apply it to every operational query before enabling school-scoped filtering.
