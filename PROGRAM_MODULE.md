# Program Module Documentation

## 1. Purpose

The Program module records support programs and links each program to beneficiary coverage clusters. A cluster can represent a school/community, group, or batch. The module uses the existing Community, Mothers, and Children data so program coverage can be viewed through the same hierarchy used by the other modules.

## 2. Routes

| Route | Purpose |
| --- | --- |
| `/program` | Lists active or ended programs. |
| `/program/:programId` | Opens one program and displays its school, group, and batch hierarchy. |
| `/program/:programId/cluster/:clusterType/:clusterName` | Displays beneficiaries for one School, Group, or Batch cluster. |

All routes are behind authentication. Program API access is also protected by the server authorization middleware.

## 3. Main Components

### `ProgramPage.jsx`

The main page component. It:

- Loads programs from `/api/programs`.
- Loads schools, groups, batches, and mothers from the Community summary API.
- Loads children from the Children API.
- Filters programs by status and search text.
- Creates and edits programs.
- Adds beneficiary coverage clusters.
- Marks clusters complete.
- Ends or deletes programs.
- Builds the school -> group -> batch -> beneficiary view.

### `ExpandableTreeTable`

Used on `/program/:programId` to display the selected program hierarchy. Its rows are built from the program's School clusters and the matching Community groups and batches.

### `PageHeader`

Displays the page title, breadcrumb, and role-appropriate primary action.

### Community icons

`BuildingIcon`, `GroupsIcon`, and `BatchesIcon` identify school, group, and batch levels. `PlusIcon`, `SearchIcon`, and `MoreVerticalIcon` support create, search, and action-menu interactions.

### `programData.js`

Contains:

- `emptyProgram`: default create/edit form values.
- `filterPrograms`: active/ended and text filtering.
- `getCluster`: finds a cluster by type and URL name.
- `clusterPath`: builds a cluster URL.
- `beneficiaryNames`: fallback display names when a cluster has a count but no individual recipient records.

## 4. Program ID and Other IDs

### Program ID

`programs.id` is the database primary key and is the authoritative program identifier. It is used in:

- `/program/:programId` URLs.
- Program create, update, end, and delete requests.
- `program_clusters.program_id` foreign keys.
- React list keys and selected-program lookup.

The frontend converts the API value to a number with `Number(program.id)`.

### Cluster ID

`program_clusters.id` is the database primary key for a saved coverage cluster. It is used when completing a saved cluster through:

```text
PATCH /api/programs/:programId/clusters/:clusterId/complete
```

A cluster without an ID can still be completed by its type and name. This is used for derived hierarchy entries and calls:

```text
PATCH /api/programs/:programId/clusters/complete
```

### School, group, and batch IDs

These IDs come from the Community module:

- School ID: `communities.id`
- Group ID: `groups.id`
- Batch ID: `batches.id`

They are used by the beneficiary-selection controls to determine which groups and batches belong to the selected school. The stored program cluster currently keeps the scope name and scope type; the Community IDs remain the source for resolving hierarchy relationships.

### Beneficiary IDs

The UI creates display-only IDs when combining records from different modules:

- Mothers: `mother-<mother id>`
- Children: `child-<child id>`

These IDs are for React rendering and selection display. They do not create a separate program-beneficiary table.

## 5. Program Data Held by the Database

### `programs`

| Column | Meaning |
| --- | --- |
| `id` | Primary key. |
| `name` | Program name. Required. |
| `type` | Feeding, Milk Subsidy, Vitamin / Supplement, Third-party Support, or Other. |
| `provider` | Partner or organization providing the program. Required. |
| `description` | Optional program description. |
| `beneficiary_type` | Mother, Child, or Mother and Child. |
| `status` | `Active` or `Ended`. |
| `target` | Program-level target column. The API currently calculates the displayed target from cluster beneficiary totals. |
| `received` | Program-level received column. The API currently calculates displayed received totals from cluster received totals. |
| `activities` | Activity count column. |
| `latest` | Date of the latest activity. |
| `ended` | Date the program was ended. |
| `created_at` | Creation timestamp. |
| `updated_at` | Last update timestamp. |

### `program_clusters`

| Column | Meaning |
| --- | --- |
| `id` | Primary key for the coverage cluster. |
| `program_id` | Foreign key to `programs.id`. Deleted automatically with the program. |
| `scope_type` | `School`, `Group`, or `Batch`. |
| `scope_name` | Name of the selected school, group, or batch. |
| `beneficiaries` | Number of beneficiaries in the cluster. |
| `received` | Number marked as having received support. |
| `created_at` | Cluster creation timestamp. |

A program can have multiple clusters. Duplicate combinations of `program_id`, `scope_type`, and `scope_name` are prevented by a unique database key.

## 6. What the Program List Displays

The `/program` screen displays:

- Active Programs or Ended Programs tab.
- Search by program name, type, provider, community, or batch.
- Program name.
- Community and batch metadata when available.
- Program type.
- Provider.
- Reached count as `received / target`.
- Latest activity date or `No activity yet`.
- Actions for Super Admin users.

The list is database-authoritative. If the API returns no saved programs, the page shows no program records instead of generating sample programs.

## 7. What the Program Detail Displays

The `/program/:programId` screen displays:

- The selected program name in the page header.
- School rows for the program's School clusters.
- Groups belonging to each school.
- Batches belonging to each group.
- Beneficiary records matched from Mothers and Children.
- The Add beneficiary action for Super Admin users.

The hierarchy uses Community records to expand the program's saved School coverage into its related groups and batches.

## 8. What the Cluster Detail Displays

The cluster route displays one cluster's beneficiary table:

- Beneficiary name.
- Cluster name.
- Program status, currently shown as Covered for cluster members.
- Latest activity.
- Distribution status: Received or Not yet recorded.

If individual recipient records are unavailable, the page creates display labels such as `Beneficiary 001` from the cluster beneficiary count.

## 9. API Endpoints

| Method | Endpoint | Function |
| --- | --- | --- |
| `GET` | `/api/programs` | Lists programs and their clusters. |
| `POST` | `/api/programs` | Creates a program. |
| `PUT` | `/api/programs/:id` | Updates program details. |
| `PATCH` | `/api/programs/:id/end` | Marks a program as ended. |
| `DELETE` | `/api/programs/:id` | Deletes a program and its clusters. |
| `POST` | `/api/programs/:id/clusters` | Adds one or more coverage clusters. |
| `PATCH` | `/api/programs/:programId/clusters/:clusterId/complete` | Marks a saved cluster as fully received. |
| `PATCH` | `/api/programs/:programId/clusters/complete` | Completes a cluster by type and name. |

All requests include the bearer token from local storage.

## 10. Permissions

- Super Admin: can create, edit, end, delete, add clusters, and complete clusters.
- Admin and Partner/Health Worker accounts: can read programs when assigned to a school.
- Assigned-school users only receive programs linked to a School cluster belonging to their assigned school.
- Users without a required school assignment are denied operational access by the existing authorization middleware.

## 11. Filtering and Search Requirements

These are required enhancements. The current implementation provides list-level status and text filtering, but does not yet provide all detail-level filters below.

### Level 1: Program list (`/program`)

- Toggle between `Active` and `Ended` programs.
- Search program name, type, provider, and associated School, Group, or Batch names.
- Add optional date filters for `created_at` and latest activity date.
- For large datasets, move filtering and pagination to the API instead of loading every program into the browser.

### Level 2: Program hierarchy (`/program/:programId`)

- Search Schools, Groups, and Batches by name.
- Keep matching parent rows visible when a child row matches the search.
- Search beneficiaries inside an expanded Batch by beneficiary name or beneficiary ID.
- Load Group, Batch, and beneficiary children lazily when a parent is expanded so the full hierarchy is not loaded at once.

### Level 3: Cluster detail (`/program/:programId/cluster/:clusterType/:clusterName`)

- Search beneficiaries by name or beneficiary ID.
- Filter distribution status by `All`, `Received`, or `Not yet recorded`.
- Support pagination, preferably 25 or 50 records per page.
- Preserve the selected filter and page when navigating within the cluster view.

## 12. Critical Flaw Check and Required Remediation

| ID | Current flaw | Required remediation |
| --- | --- | --- |
| F1 | `program_clusters` stores `scope_name` but not the Community record ID. Renaming a school, group, or batch can break the relationship. | Add a nullable `scope_id` and store the source ID with the name. Resolve display names by ID first. Use `scope_name` only as a legacy fallback and log unresolved legacy records. |
| F2 | Beneficiary matching is not explicit. | Define matching by scope type: Batch uses `batch_id`, Group uses `group_id`, and School uses `community_id` on Mothers and Children. Use name matching only for legacy clusters without `scope_id`. Deduplicate records by source type and source ID. |
| F3 | The current page loads all summary and child data together, which will not scale for large batches. | Add `page` and `limit` to beneficiary-list endpoints. Load hierarchy children lazily when expanded. Return total count and page metadata. |
| F4 | Completion semantics are ambiguous for empty clusters and could allow invalid received totals. | Validate non-negative integers and enforce `0 <= received <= beneficiaries` in the backend. Completing a non-empty cluster sets `received = beneficiaries`; an empty cluster remains at zero and should return a clear validation response if completion is not meaningful. |
| F5 | The Record activity modal exists but is not currently opened or persisted. | Add a `program_activities` table with `program_id`, `user_id`, action, metadata, and timestamp. Update `activities` and `latest` transactionally when an activity is saved. |
| F6 | Detail-view APIs do not currently accept search or filter parameters. | Add validated `search`, `status`, `filterBy`, `page`, and `limit` query parameters to list, hierarchy, and beneficiary endpoints. Keep authorization filters applied before user-supplied filters. |
| F7 | Program creation can exist without a coverage cluster, so school-scoped users cannot discover an unassigned program. | Define whether unassigned programs are Super Admin-only drafts or require a School cluster before activation. Do not expose an unassigned program to a school-scoped user. |

### Required API additions

The implementation plan should include:

```text
GET /api/programs?search=&status=&page=&limit=
GET /api/programs/:id?search=&filterBy=
GET /api/programs/:programId/cluster/:type/:name/beneficiaries?search=&status=&page=&limit=
POST /api/programs/:id/clusters
```

The cluster-create payload should include `scopeType`, `scopeId`, and `scopeName`. The backend must verify that the ID belongs to the requested scope type before inserting it.

## 13. Current Limitations

1. The Record activity modal exists in `ProgramPage`, but there is currently no active button that opens it.
2. Activity saving is not connected to a dedicated activity table or API endpoint. Program and cluster CRUD operations are database-backed, but activity history is not yet persisted.
3. Program coverage stores scope names rather than direct school/group/batch foreign keys. The existing Community data is used to resolve the hierarchy by name.
4. The program `recipients` array is supported by the frontend response mapper, but the current program API does not populate a dedicated recipient list.
5. Detail-level filtering and pagination are requirements but are not implemented in the current page/API.

## 14. Typical Workflow

1. Super Admin opens `/program`.
2. Super Admin creates a program with name, type, provider, description, and beneficiary type.
3. The program is inserted into `programs` and returned with its database ID.
4. Super Admin opens the program and selects School, Group, or Batch coverage.
5. Selected scopes are inserted into `program_clusters`.
6. The API returns the updated program, including cluster totals.
7. The detail page displays the school hierarchy and linked beneficiaries.
8. Completing a cluster updates its `received` value to the cluster beneficiary count.
9. Ending a program changes its status to `Ended` and stores the end date.
