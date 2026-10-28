# Kin's Flow

Kin's Flow is the in-app role guide for authenticated MCHMS users. It follows the
existing role permissions and the navigation links shown to each account.

## Help menu

The `?` button in the top bar opens:

- **Show me around**: a role-specific guided tour through the user’s main pages.
- **Explain this page**: the page purpose and a list of visible, enabled controls.
- **How it works**: the workflow across roles, with Once, Daily, and Weekly tasks.

The guided tour can be replayed from the help menu. Escape closes a guide, and
the arrow keys move between tour steps when the user is not typing in a field.

## Role workflow

1. **Superadmin** sets up schools and accounts in Community and User Management,
   then reviews system activity in Reports.
2. **Community Coordinator** prepares the assigned school and team, registers
   beneficiaries, sets up projects, and coordinates follow-up.
3. **Health Worker** reviews assigned-group records, records permitted check-ups,
   and records allowed project receipts.
4. **Admin** and **Partner** review operational activity and reports within their
   read-only access.

The role map shows each role’s suggested Once, Daily, and Weekly actions with
the corresponding app navigation path. These rhythms are guidance, not scheduled
jobs or additional access rules.

## First sign-in

Newly signed-in real accounts receive a skippable setup guide based on their
role. Completion or skip is stored in browser local storage under a key scoped
to the user ID. The guide navigates to existing pages only; it does not create
beneficiaries, users, projects, or other records.

## Card explanations

Dashboard cards, dashboard metrics, and shared module/community summary cards
have accessible `i` buttons. Their “What it is” and “What it’s for” copy is
centralized in `src/kinFlow/infoContent.mjs`. The source-scan test checks the
summary-card labels against that map.

Run the focused checks with:

```powershell
node --test src/kinFlow/flowContent.test.mjs src/kinFlow/infoContent.test.mjs
```

## Demo separation

Kin's Flow does not create or modify demo accounts. The existing build-time
synthetic demo remains separate; the authenticated app’s role guide and
first-sign-in setup do not run inside that demo app.
