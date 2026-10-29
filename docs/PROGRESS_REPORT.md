# Progress Report Guide

Progress Report lets authorized operational roles review profile, monitoring, and project records within their permitted school/group scope. Admin and Partner can review global operational data; Community Organizers and Health Workers are restricted to their assignments. Superadmins do not have access to this module. See [Users, Roles, Permissions, and Data Scope](./ROLES_AND_ACCESS.md).

## Build a report

1. In **Community & Report Focus**, select the available school, group, and batch scope. Assigned users may have some or all of these values fixed by their account.
2. Choose **Profile Report**, **Monitor Report**, or **Project Report** and the beneficiary type where applicable.
3. In **Growth Metrics**, choose the profile sections, monitoring indicator, or project fields to include.
4. Open **Results** to review the matching records. The API applies the user's role and assignment scope regardless of the filters shown in the interface.

## Results

### Profile Report

- **Profile section** switches between General, Prenatal / OB, Medical / Dental, and Vaccine fields.
- **Group** and **Batch** filters appear when the report contains multiple corresponding values. Selecting a group narrows the available batches.
- The report automatically shows a table for school/group scopes and a graph when the selected scope supports one. The Table View / Graph View switch is hidden.
- The table's Group and Batch filters can further narrow the displayed rows.
- **Customize table** controls visible columns. The beneficiary name stays visible during horizontal table scrolling.
- Empty profile values are left blank. Explicit values such as `No`, `None`, and `0` remain visible.
- City/municipality and province are presented as separate birth-place fields when those values are available.
- Graphs are available when the report is for a selected batch or contains one beneficiary. They graph the selected profile field.

The Results Group/Batch filters narrow the displayed table. CSV exports use the generated report scope and do not apply those local table-only filters; set the Community selection before generating the report when an export must be limited to a particular group or batch.

### Monitor Report

- The report automatically shows a table or graph based on the generated report settings; the Table View / Graph View switch is hidden. Tables present the selected growth indicator and can show a latest summary or monitoring-date history.
- **Growth Metrics** also lets you select the stored child or maternal check-up details to show in monitoring-date history and its CSV export. The available fields are selected by default and can be unchecked to simplify the table.
- Monitoring-date history ends with an **Average** row for numeric measurements and support quantities only; Boolean flags and check-up sequence numbers are not averaged. The monitoring table CSV includes the same summary row.
- Graphs display growth progression over time. Depending on beneficiary type and selected indicator, they can show an individual beneficiary or all beneficiaries in a batch.
- Admin and Partner users can change the School filter in the results table; changing it reloads the report for that school and clears narrower group/batch scope. In Graph View, the Batch filter narrows the plotted beneficiaries and the graph CSV export to that batch.
- Use the graph's metric and date-range controls to adjust the visualization. CSV export is available from the active Results view.

### Project Report

- Select **Overall** or **Monthly** under Benefit period. Monthly reports also require a month.
- Tables list the beneficiaries and selected project values.
- Graphs plot the selected receipt metric by beneficiary. The graph metric selector offers Total Received Benefits, Receipt Frequency, and Average Received per Month.
- Changing the benefit period or month refreshes the report using the selected report view.

## Export and data handling

- Export CSV from Results after confirming the report category and community scope.
- Report downloads are audited. Treat report files as sensitive operational data and follow local retention and sharing rules.
- Profile group and batch table filters are local display filters, not authorization controls. School changes reload through the report API; filters do not expand access, and the server remains authoritative for access and scope.
- AI-generated report suggestions are optional and should be checked before use. See the [Integrated AI guide](./INTEGRATED_AI.md).

## Implementation references

- [Progress Report page and report state](../src/pages/ProgressReport/ProgressReport.jsx)
- [Results and graph components](../src/pages/ProgressReport/components/)
- [Report field catalog and formatting](../src/pages/ProgressReport/progressReportConfig.js)
- [Progress Report API and scope enforcement](../server/routes/progressReport.js)
- [Role access matrix](./ROLES_AND_ACCESS.md)
