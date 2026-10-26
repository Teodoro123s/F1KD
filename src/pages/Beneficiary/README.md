# Beneficiary feature layout

This folder is the owner for beneficiary routes and shared beneficiary UI.

- `BeneficiaryPage.jsx` composes the route-level list, create flows, and profile detail.
- `BeneficiaryListPage.jsx` and `BeneficiaryTable.jsx` own list display and selection.
- `components/`, `hooks/`, and `utils/` hold code shared by the mother and child workflows.
- `child/` contains child forms, profiles, and child-specific history pages.
- `mother/` contains mother forms, profiles, monitoring, and claims.

The beneficiary status dropdown filters monitoring completion (`Complete monitoring`/`Incomplete monitoring`) and scheduled check-up status (`Pending check-up`/`Missing check-up`). A check-up due today is pending; a scheduled check-up before today is missing. Pending also includes records without a scheduled date.

Several top-level files with mother/child names are compatibility re-exports. They preserve older import paths and should stay thin. Add new behavior to the corresponding file under `child/` or `mother/`, and use that canonical module path for new imports.
