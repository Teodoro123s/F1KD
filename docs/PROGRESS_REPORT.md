# Progress Report Guide

Progress Report lets authorized operational roles review profile, monitoring, and project records within their permitted school/group scope. Admin and Partner can review global operational data; Community Organizers and Health Workers are restricted to their assignments. Superadmins do not have access to this module. See [Users, Roles, Permissions, and Data Scope](./ROLES_AND_ACCESS.md).

## Build a report

1. In **Community & Report Focus**, select the available school, group, and batch scope. Assigned users may have some or all of these values fixed by their account.
2. Choose **Profile Report**, **Monitor Report**, or **Project Report** and the beneficiary type where applicable.
3. In **Growth Metrics**, choose the profile sections, monitoring indicator, or project fields to include.
4. Open **Results** to review the matching records. The API applies the user's role and assignment scope regardless of the filters shown in the interface.

## Results views

### Profile Report

- **Profile section** switches between General, Prenatal / OB, Medical / Dental, and Vaccine fields.
- **Group** and **Batch** filters appear when the report contains multiple corresponding values. Selecting a group narrows the available batches.
- **Customize table** controls visible columns. The beneficiary name stays visible during horizontal table scrolling.
- Empty profile values are left blank. Explicit values such as `No`, `None`, and `0` remain visible.
- City/municipality and province are presented as separate birth-place fields when those values are available.
- Graph View is available when the report is for a selected batch or contains one beneficiary. It graphs the selected profile field.

The Results Group/Batch filters narrow the displayed table. CSV exports use the generated report scope and do not apply those local table-only filters; set the Community selection before generating the report when an export must be limited to a particular group or batch.

### Monitor Report

- Table View presents the selected growth indicator and can show a latest summary or monitoring-date history.
- Graph View displays growth progression over time. Depending on beneficiary type and selected indicator, it can show an individual beneficiary or all beneficiaries in a batch.
- Use the graph's metric and date-range controls to adjust the visualization. CSV export is available from the active Results view.

### Project Report

- Select **Overall** or **Monthly** under Benefit period. Monthly reports also require a month.
- Table View lists the beneficiaries and selected project values.
- Graph View plots the selected receipt metric by beneficiary. The graph metric selector offers Total Received Benefits, Receipt Frequency, and Average Received per Month.
- Changing the benefit period or month refreshes the report while keeping the current Table or Graph view selected.

## Export and data handling

- Export CSV from Results after confirming the report category and community scope.
- Report downloads are audited. Treat report files as sensitive operational data and follow local retention and sharing rules.
- Profile group and batch table filters are local display filters, not authorization controls. They do not expand access; the server remains authoritative for access and scope.
- AI-generated report suggestions are optional and should be checked before use. See the [Integrated AI guide](./INTEGRATED_AI.md).

## Implementation references

- [Progress Report page and report state](../src/pages/ProgressReport/ProgressReport.jsx)
- [Results and graph components](../src/pages/ProgressReport/components/)
- [Report field catalog and formatting](../src/pages/ProgressReport/progressReportConfig.js)
- [Progress Report API and scope enforcement](../server/routes/progressReport.js)
- [Role access matrix](./ROLES_AND_ACCESS.md)
