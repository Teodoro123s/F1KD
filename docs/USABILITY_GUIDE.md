# Usability and In-App Guidance

This document describes the guidance currently available in F1KD to help users understand the interface, follow role-appropriate workflows, and interpret unfamiliar form labels. It covers implemented features, not a complete list of every application capability.

## In-app help menu

The **?** control in the top bar opens three kinds of help:

- **Show me around** gives a guided tour of pages and actions relevant to the signed-in account role. Users can move through the steps, go back, skip a step, pause and resume, exit, or restart the tour. Progress is shown as a numbered step and saved to the signed-in account.
- **Explain this page** summarizes the current page and explains selected visible controls. Page explanations can vary by role so they do not instruct users to take actions unavailable to their account.
- **How it works** describes the signed-in role's purpose and suggested setup, daily, and weekly tasks. It shows only that account's workflow; it does not offer a role switcher. The suggested timing is guidance, not an enforced schedule.
- **Field definitions** keeps maternal and child check-up explanations available from the Help Center, including when optional field tooltips are turned off.

## Personal guidance preferences

The **Settings → Help and Guidance** section stores preferences for the signed-in account on the server. They remain available after refresh and sign-out, and are not shared with other users.

Users can enable or disable:

- Role-specific guided tours.
- The one-time welcome for newly created accounts.
- Optional contextual tooltip icons.
- Page explanations.
- The role-specific workflow guide.

Essential screening and clinical-safety explanations remain visible even when optional tooltips are disabled. Required indicators, validation messages, warnings, and operational instructions are not controlled by the tooltip preference.

The Settings section also shows whether onboarding was completed or dismissed and whether the role tour has not started, is in progress, or is complete. An unfinished tour resumes from the Help menu; completed tours can be restarted there. **Reset to defaults** requires confirmation, restores guidance switches and progress, and shows the welcome invitation again. It does not change account permissions or operational records.

For accounts that existed before this feature, guidance preferences use enabled defaults without automatically opening onboarding. Newly created accounts receive a single welcome invitation at first use; users can dismiss it and start the tour later from Help.

Available role-specific tours and workflows cover:

| Account role | Guidance focus |
| --- | --- |
| Super Admin | Set up schools and user access, review organization activity |
| Admin | Review operational records and progress available to the account |
| Community Coordinator | Work with the automatically assigned school, organize groups and batches, manage assigned community work |
| Health Worker | Work with the assigned group and beneficiaries, record check-ups, review monitoring records |
| Partner | Review assigned beneficiary, project, and progress information |

The actual permissions and data scope for an account are controlled by the application, not by these explanations. Guidance is informational and should not be treated as an authorization rule.

## Contextual help on check-up forms

Small information icons appear beside selected labels. Hover over an icon or focus it with the keyboard to read its tooltip. On a touch device, tap the icon if the tooltip is not otherwise visible.

### Maternal check-up

Tooltips clarify:

- **Gestation Period** — pregnancy duration in weeks, including whether the value is calculated from the recorded last menstrual period (LMP) date.
- **Month of Trimester** — the calculated four-week period; it is not a calendar month.
- **Blood Pressure** — systolic/top and diastolic/bottom values, the expected `120/80` format, and the app's suggested screening ranges. The tooltip notes that a reading is not a diagnosis.
- **Auto-Calculation/BMI** and **BMI Status** — what BMI means, how it is calculated, and that pregnancy affects interpretation.
- **Developmental Screening** — the screening status is recorded for the visit and is not a diagnosis.
- **Referral to Hospital** — selecting Yes opens related test and assistance fields.
- **Laboratory Request(s)** — select requested tests, not test results.
- **Assistance Amount**, **Source of Funds**, and **Facility Type** — what information to record for referral assistance.

### Child check-up

Tooltips clarify:

- **Current month** — the monthly check-up sequence from M1 through M24.
- **Current Age** — age on the check-up date, calculated from date of birth.
- **Feeding Method** — examples of exclusive breastfeeding, mixed feeding, and complementary feeding.
- **Length** and **Head Circumference** — which measurements to record and their units.
- **Weight-for-Age**, **Length-for-Age**, and **Weight-for-Length** — what each WHO reference compares and that the result is a screening indicator, not a diagnosis.
- **Developmental Screening** — record the screening outcome and understand that follow-up statuses are not diagnoses.

## Other contextual tooltips

The same information-icon pattern is also used in selected places outside check-up forms, including:

- Beneficiary contact and PhilHealth number fields, to explain input formats.
- Batch documentation uploads, to explain file types, photo counts, and size limits.
- Progress report setup and AI report prompts, to explain available fields and the selected report scope.

## Navigating paginated lists

Community, User Management, Beneficiary, Monitoring, Archive, Reports/Notifications, and Progress Report use a consistent pagination layout. Use the numbered buttons to go directly to a page, or Previous/Next to move one page at a time. Where available, the **Show** selector changes the number of entries per page. The range summary indicates which results are currently displayed. On narrow screens, the controls condense to keep navigation usable without horizontal scrolling.

Pagination controls do not change the filters or access scope applied to the list; those continue to follow the current page and account permissions.

## Archiving mothers and children

Archiving a mother also archives her currently active child records. Existing child health and history records are retained. The Archive confirmation shows how many active children will be archived; children already archived separately are left unchanged. Restoring the mother restores only children archived as part of that mother's archive action. Restore the parent hierarchy first if it is archived.

## Using data tables on smaller screens

Data tables keep their columns and header alignment instead of squeezing every column into the available width. When a table is wider than its panel, swipe horizontally inside the table area; the surrounding page remains separate. Scrollable table areas can also receive keyboard focus so they can be moved without a touch gesture or mouse wheel. Text wraps at normal word boundaries, while dates and action controls retain compact layouts. The vaccine-entry form uses labeled cards on small screens rather than hiding its field labels.

## Accessibility and limitations

- Tooltip icons can receive keyboard focus, and tooltips are associated with their icons for assistive technology.
- Scrollable tables retain native header and cell semantics and expose a labeled, keyboard-focusable scrolling region.
- Role-specific help is derived from the signed-in account's role. If no workflow is configured for a role, the app says so rather than showing another role's steps.
- Help text explains selected controls and terms; it does not replace formal clinical guidance, training, or professional judgment.
- Screening interpretations and thresholds are explanatory context only. Consult a qualified health worker for clinical interpretation.
- Not every field or page has a tooltip. The help menu and page guide provide broader orientation where contextual help is not present.

## Implementation references

- Help menu, tours, page explanations, and role-based workflows: [`src/components/HelpCenter.jsx`](../src/components/HelpCenter.jsx)
- Role guide and page-specific copy: [`src/guides/kinFlowGuides.mjs`](../src/guides/kinFlowGuides.mjs)
- Shared tooltip component: [`src/components/ui/FieldInfoTooltip.jsx`](../src/components/ui/FieldInfoTooltip.jsx)
- Maternal check-up tooltips: [`src/pages/Beneficiary/mother/MotherCheckup.jsx`](../src/pages/Beneficiary/mother/MotherCheckup.jsx)
- Child check-up tooltips: [`src/pages/Monitoring/ChildMonitor.jsx`](../src/pages/Monitoring/ChildMonitor.jsx)
