# Shared Dashboard UI

This folder contains the common dashboard source and utilities. Each role's
independent dashboard implementation is copied into its folder under `pages/roles/`.

## Contents
- `DashboardPage.jsx` - selects the signed-in user's dashboard
- `shared/DashboardOverview.jsx` - reusable dashboard panels
- `components/` - reusable dashboard widgets

The role-to-module mapping is documented in [../../README.md](../../README.md)
and enforced by [../../utils/permissions.js](../../utils/permissions.js) plus
backend authorization middleware. Changes to a role's dashboard should be made
in that role's folder; this source remains available to shared routes.
