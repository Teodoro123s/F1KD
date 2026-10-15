# Community Create Menu

## Problem

The Community page header showed one create button whose action depended on the current view. This made creating a group or batch less discoverable and prevented users from choosing the record type directly, similar to the Create Mother / Create Child menu in Beneficiaries.

## Resolution

The Community header now provides a **Create** dropdown:

- At the Schools level, it offers Create School, Create Group, and Create Batch.
- In a school or group drill-down, it offers Create Group and Create Batch.
- Selecting an action opens the corresponding existing form.
- The form receives the current school/group context when available; at the Schools level it lets the user choose the relevant school or group.
- The menu closes after choosing an action, clicking outside it, or pressing Escape.
- The same behavior is wired into both standard Community and Superadmin Community views, while their existing permissions and scoping remain in force.

## Implementation

- `src/pages/Community/components/CommunityToolbar.jsx` renders the menu and handles its open/close behavior.
- `src/pages/Community/CommunityPage.jsx` selects and initializes the requested create form for standard Community users.
- `src/pages/Community/SuperAdminCommunityPage.jsx` selects and initializes the requested form for Superadmins.

## Verification

The production frontend build passed with `npm run build`. The live Community page was checked and the Create menu showed **Create Group** and **Create Batch** in the Groups view.
