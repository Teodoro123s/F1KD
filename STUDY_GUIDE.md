# Full-Stack Development Study Guide

Concise answers to the REST API, backend, frontend, validation, database, Docker, deployment, and full-stack questions, followed by questions about how those ideas apply to F1KD.

## REST API & Routing

1. **What is the difference between `PUT` and `PATCH` in a REST API?**  
   `PUT` replaces the resource representation at a known URI; omitted fields may be cleared or reset. `PATCH` applies a partial change, so fields not mentioned normally remain unchanged.

2. **When should you use `POST` vs `PUT` for creating a resource?**  
   Use `POST` when the server chooses the new resource's URI, such as `POST /users`. Use `PUT` when the client knows the URI and wants to create or replace that exact resource, such as `PUT /users/42`.

3. **What does idempotency mean, and which HTTP methods are idempotent?**  
   An operation is idempotent if repeating the same request has the same intended effect as performing it once. `GET`, `HEAD`, `OPTIONS`, `TRACE`, `PUT`, and `DELETE` are defined as idempotent; `POST` and `PATCH` are not guaranteed to be. An idempotent request can still return a different response on a retry.

4. **What is the difference between `401 Unauthorized` and `403 Forbidden`?**  
   `401` means valid authentication credentials are missing or unacceptable. `403` means the caller is authenticated but is not allowed to perform the requested action.

5. **When should you return `200` vs `201` vs `204`?**  
   Return `200 OK` for a successful request with a response representation. Return `201 Created` when a resource is created (include its representation and/or a `Location` header when useful). Return `204 No Content` when the request succeeded and there is no response body to send.

6. **What is HATEOAS, and is it required for a REST API?**  
   HATEOAS (Hypermedia as the Engine of Application State) means responses include links or actions that let clients discover what they can do next. It is a constraint of REST's formal definition, but many APIs called REST APIs use fixed documented routes instead.

7. **How do you version a REST API (`/v1/`, headers, query params)?**  
   Put a major version in the path (for example, `/api/v1/users`) for simple visibility and routing. Media-type headers avoid versioning the path but are harder to inspect; query parameters are easy to add but can mix versions into normal filtering. Pick one policy, document compatibility guarantees, and avoid breaking existing clients without a migration plan.

8. **What is the difference between path parameters and query parameters?**  
   Path parameters identify a resource or hierarchy, such as `/users/42/posts/8`. Query parameters modify the representation or result set, such as `/users?page=2&status=active`.

9. **How do you handle pagination (offset vs cursor-based)?**  
   Offset pagination (`limit`/`offset` or `page`/`perPage`) is simple and supports jumping to a page, but large offsets can be slow and concurrent changes can shift results. Cursor pagination uses a stable ordered key and is efficient for large or changing data, but generally supports next/previous traversal rather than arbitrary page jumps. Always validate limits and return pagination metadata.

10. **What is CORS, and why does the browser block cross-origin requests?**  
    Cross-Origin Resource Sharing is a browser-enforced policy that controls whether a page from one origin may read responses from another. The browser uses preflight `OPTIONS` requests when needed; the API must return appropriate origin, method, header, and credential permissions. CORS is not a substitute for authentication or authorization.

11. **What is the difference between authentication and authorization?**  
    Authentication establishes who the caller is. Authorization decides what that identity may read or change.

12. **How do you design a nested resource route (e.g., `/users/1/posts/5`)?**  
    Nest when the child's identity or lifecycle is meaningfully scoped to its parent. Ensure the server verifies that post `5` actually belongs to user `1`; otherwise a flat route such as `/posts/5` may be clearer.

13. **What is a webhook, and how does it differ from polling?**  
    A webhook is an HTTP callback sent by one system to another when an event occurs. Polling repeatedly asks for updates on a schedule; webhooks are usually faster and cheaper, but require a reachable receiver, signature verification, retries, and idempotent event processing.

14. **What is the difference between REST, GraphQL, and gRPC?**  
    REST commonly exposes resources through HTTP methods and resource URLs, often using JSON. GraphQL exposes a typed query/mutation schema where clients select response fields. gRPC uses generated contracts and compact Protocol Buffers over HTTP/2, making it well-suited to typed service-to-service calls and streaming.

15. **How do you return validation errors in a consistent API format?**  
    Use one documented shape, such as `{ "status": 400, "code": "VALIDATION_ERROR", "message": "...", "errors": [{ "field": "email", "code": "INVALID_FORMAT", "message": "Enter a valid email." }] }`. Keep field paths and error codes stable, avoid exposing stack traces or internal details, and use the same shape across endpoints.

## Backend

1. **What is the difference between a monolithic and microservice architecture?**  
   A monolith deploys a system as one application, often sharing code and data access; it is usually simpler to develop and operate early on. Microservices split capabilities into independently deployed services, which can scale separately but add network, observability, consistency, and deployment complexity.

2. **What is middleware, and how does it work in an Express/Django/Spring app?**  
   Middleware is code in the request/response pipeline. It can inspect or modify a request, authenticate it, log it, reject it, or pass control to the next middleware/handler; ordering matters.

3. **How do you handle environment variables and secrets in a backend app?**  
   Read configuration from environment variables, validate required values at startup, and keep real secrets in an approved secret manager or protected deployment configuration. Do not commit secrets, print them in logs, or bake them into frontend bundles or container images.

4. **What is the difference between synchronous and asynchronous request handling?**  
   Synchronous work blocks the current execution path until it finishes. Asynchronous I/O lets a server continue handling other work while waiting on a database, network, or file operation; it does not automatically make CPU-heavy work faster.

5. **What is a race condition, and how do you prevent it in a backend service?**  
   A race condition occurs when concurrent operations produce a result that depends on their timing. Use database transactions, unique constraints, atomic updates, locks where appropriate, and idempotency keys for retried operations.

6. **How do you implement rate limiting on an API?**  
   Limit requests per identity or IP within a defined time window, return `429 Too Many Requests` with a retry hint, and exempt or separately budget trusted health checks as needed. In multi-instance production, use a shared store such as Redis so every instance enforces the same limit.

7. **What is a connection pool, and why is it important?**  
   A pool reuses a bounded set of database connections instead of opening one for every request. It controls resource usage and reduces connection setup latency; pool size and timeouts should reflect database capacity and application concurrency.

8. **How do you handle long-running tasks (queues, workers, cron jobs)?**  
   Accept the request, validate and persist a job, then return promptly (often `202 Accepted` with a job/status URL). A worker processes it asynchronously with retries, idempotency, observability, and a dead-letter strategy; scheduled work belongs in a reliable scheduler rather than a web request.

9. **What is the difference between horizontal and vertical scaling?**  
   Vertical scaling gives one machine more CPU, memory, or storage. Horizontal scaling adds more application instances and requires attention to shared state, load balancing, data consistency, and session management.

10. **How do you implement JWT authentication vs session-based authentication?**  
    With JWTs, the server signs claims that clients send with requests; validate signature, expiry, issuer/audience, and permissions, and plan revocation/rotation. With sessions, the server stores session state and the browser sends an opaque cookie; use secure cookie settings and CSRF protections where needed. Both need TLS and careful credential storage.

11. **What is CSRF, and how do you protect against it?**  
    Cross-Site Request Forgery tricks a browser into sending an authenticated request using ambient cookies. Use `SameSite` cookies, anti-CSRF tokens or origin checks, and avoid state-changing `GET` routes; bearer tokens not automatically attached by the browser have different CSRF exposure but can still be stolen by XSS.

12. **What is SQL injection, and how do you prevent it?**  
    SQL injection happens when untrusted input is interpreted as SQL syntax. Use parameterized queries or prepared statements for values, allowlist dynamic identifiers, apply least-privilege database accounts, and do not build SQL by concatenating user input.

13. **What is the difference between a 500 error and a 503 error?**  
    `500 Internal Server Error` means the server encountered an unexpected failure. `503 Service Unavailable` means it is temporarily unable to handle the request (for example, overload or planned maintenance); include `Retry-After` when known.

14. **How do you structure a backend project (controllers, services, repositories)?**  
    Keep HTTP parsing/status handling in routes or controllers, business rules in services, and persistence/query details in repositories or data-access modules. The exact layers should reduce coupling and improve testing without adding empty abstractions.

15. **What is the N+1 query problem, and how do you fix it?**  
    It occurs when code loads a collection and then runs another query per item. Replace per-record queries with joins, eager loading, batch queries, or a data loader, and verify with query logs or performance tests.

## Frontend

1. **What is the difference between controlled and uncontrolled components in React?**  
   A controlled input gets its value from React state and reports edits through an event handler. An uncontrolled input keeps its current value in the DOM and is usually read through a ref or form submission.

2. **What is the virtual DOM, and how does React use it?**  
   React represents rendered UI as an element tree, compares successive render results, and applies necessary changes to the real DOM. It is a programming model and reconciliation process, not a guarantee that every update is faster.

3. **What is the difference between `useEffect` and `useLayoutEffect`?**  
   `useEffect` runs after the browser paints and is appropriate for most network requests, subscriptions, and synchronization. `useLayoutEffect` runs after DOM changes but before paint, useful for layout measurement or avoiding visual flicker; it can block painting.

4. **How do you manage global state (Context, Redux, Zustand)?**  
   Use local component state for local concerns. Context works well for relatively stable shared values such as the current user; Redux or Zustand can help when many components need complex, frequently updated state, predictable transitions, or specialized tooling.

5. **What is the difference between client-side and server-side rendering?**  
   Client-side rendering builds much of the UI in the browser after JavaScript loads. Server-side rendering sends rendered HTML from a server, often improving initial content delivery and discoverability, but adds server rendering and hydration complexity.

6. **How do you handle form validation on the frontend?**  
   Validate early for usability, show accessible field-specific messages, preserve the user's input, and prevent clearly invalid submission. Treat frontend validation as helpful feedback, not a security boundary; repeat validation on the backend.

7. **What is the difference between `debounce` and `throttle`?**  
   Debounce waits until events stop for a period before running once, useful for search input. Throttle runs at most once per interval, useful for frequent events such as scrolling or pointer movement.

8. **How do you prevent unnecessary re-renders in React?**  
   Keep state near where it is used, avoid recreating expensive derived data, split components by update boundaries, and use `memo`, `useMemo`, or `useCallback` only when profiling shows a benefit. Stable keys and avoiding needless context updates also help.

9. **What is the difference between `localStorage`, `sessionStorage`, and cookies?**  
   `localStorage` persists by origin until cleared; `sessionStorage` is scoped to a tab session; neither is automatically sent with HTTP requests. Cookies can expire and are automatically sent to matching requests, and `HttpOnly`, `Secure`, and `SameSite` attributes control important security behavior.

10. **How do you handle authentication tokens on the frontend securely?**  
    Prefer short-lived access tokens held in memory and refresh credentials in `HttpOnly`, `Secure`, appropriately `SameSite` cookies, with CSRF defenses as needed. Avoid persistent JavaScript-readable tokens where possible because XSS can steal them; apply CSP, output escaping, dependency hygiene, and TLS.

11. **What is a controlled input, and how do you make a field required?**  
    A controlled input's `value` is driven by React state and updated via `onChange`. Add the HTML `required` attribute for browser feedback and enforce the same rule in application logic and on the server.

12. **What is the difference between `onChange` and `onBlur` validation?**  
    `onChange` validates as the user edits, providing quick feedback but sometimes too eagerly. `onBlur` validates after the user leaves a field, which is less distracting; many forms validate on blur first and then on change after an error appears.

13. **How do you handle loading and error states in a UI?**  
    Model loading, success, empty, and error states explicitly. Show progress for slow operations, preserve retry options and relevant input on failure, and announce important updates accessibly rather than rendering blank screens or swallowing errors.

14. **What is a React key, and why does it matter in lists?**  
    A key gives each sibling a stable identity so React can match items across inserts, removals, and reordering. Use a persistent unique ID where possible; array indexes can associate state with the wrong item when a list changes.

15. **How do you handle routing in a single-page app (React Router, Next.js)?**  
    Define route-to-page mappings, route parameters, nested layouts, and authorization guards; links should work on direct refresh through a server fallback to the SPA entry point. Frameworks such as Next.js also provide server rendering and filesystem-based routing.

## Making Fields Required (Validation)

1. **How do you enforce required fields on the frontend?**  
   Use semantic form controls and HTML constraints such as `required`, then add clear, accessible messages and prevent submission until valid. Do not rely on browser validation alone because clients can bypass it.

2. **How do you enforce required fields on the backend?**  
   Validate the request body before business logic or database writes, reject missing/invalid values with `400` or `422`, and enforce critical invariants again with database `NOT NULL`, `UNIQUE`, or foreign-key constraints.

3. **What is the difference between client-side and server-side validation?**  
   Client-side validation gives immediate feedback and can reduce avoidable requests. Server-side validation is authoritative because requests can come from modified clients, scripts, or direct HTTP calls.

4. **How do you validate nested or array fields?**  
   Validate the overall object shape, array length, each item's type and fields, and any cross-item constraints (such as unique IDs). Return errors with precise paths such as `children[2].birthDate`.

5. **What is a schema validation library (Zod, Joi, Yup), and why use one?**  
   It defines data types and constraints in a reusable schema and parses untrusted input into validated values. It reduces duplicated checks and can produce consistent field errors; schemas still need to match business rules and database constraints.

6. **How do you return field-specific error messages from an API?**  
   Include a stable code and a list of `{ field, code, message }` errors, using dotted or bracketed paths for nested values. Keep messages safe and actionable, and do not reveal private data or internal validation implementation details.

7. **How do you validate file uploads (type, size, dimensions)?**  
   Enforce size and count limits; allowlist expected formats; inspect file signatures/content rather than trusting the extension or browser MIME type; and decode images to verify dimensions. Store files outside executable paths, use generated storage names, and scan or quarantine risky files where appropriate.

8. **What is the difference between validation and sanitization?**  
   Validation decides whether input meets the expected rules. Sanitization transforms input into a safer or canonical form; it should not replace context-aware output encoding, parameterized database queries, or validation.

9. **How do you handle optional vs required query parameters?**  
   Specify which parameters are required, defaults, formats, allowed values, and behavior when absent. Parse and validate them at the API boundary; do not treat an invalid supplied value as if it were omitted.

10. **How do you validate email, phone, and password formats?**  
    Normalize only where appropriate, use a practical email format check plus confirmation where needed, and validate phone numbers with a country-aware library or explicit accepted formats. Set a password policy based on risk and usability, store only a strong password hash (such as bcrypt/Argon2), and never log the plaintext password.

## MariaDB / Databases

1. **What is the difference between MariaDB and MySQL?**  
   MariaDB began as a MySQL-compatible fork and shares much syntax and protocol behavior, but engines, features, defaults, and versions have diverged. Test compatibility against the specific versions and drivers you deploy.

2. **What is the difference between `INNER JOIN`, `LEFT JOIN`, and `RIGHT JOIN`?**  
   `INNER JOIN` returns rows with matches on both sides. `LEFT JOIN` keeps every left-side row and fills unmatched right columns with `NULL`; `RIGHT JOIN` does the converse and is often rewritten as a left join for readability.

3. **What is an index, and when should you add one?**  
   An index is an auxiliary structure that speeds up lookups, joins, and ordering for selected columns. Add one for measured frequent query patterns and foreign-key access, but account for storage and the extra work indexes add to writes; inspect query plans.

4. **What is the difference between a primary key and a unique key?**  
   A primary key is the table's chosen row identity and cannot be `NULL`; a table has one primary-key constraint, which may contain multiple columns. A table can have multiple unique constraints, whose null behavior depends on the database.

5. **What is a foreign key, and what happens on delete (`CASCADE`, `SET NULL`, `RESTRICT`)?**  
   A foreign key enforces a relationship to a referenced key. `CASCADE` deletes dependent rows, `SET NULL` clears the reference (so the column must allow nulls), and `RESTRICT`/`NO ACTION` prevents deletion while dependents exist; choose based on data-retention rules.

6. **What is database normalization (1NF, 2NF, 3NF)?**  
   1NF stores atomic values and avoids repeating groups. 2NF removes dependencies on only part of a composite key; 3NF removes transitive dependencies where non-key facts depend on other non-key facts. Normalize to protect consistency, then denormalize deliberately when measurements justify it.

7. **What is a transaction, and what are ACID properties?**  
   A transaction groups database operations into one logical unit. ACID means atomicity (all-or-nothing), consistency (constraints remain valid), isolation (concurrent work behaves according to an isolation level), and durability (committed work survives failures).

8. **What is the difference between `DELETE`, `TRUNCATE`, and `DROP`?**  
   `DELETE` removes selected rows and can use `WHERE`; `TRUNCATE` quickly empties a table with database-specific transaction/identity behavior; `DROP` removes the table definition and its data. All can be destructive, so confirm backups and environment before running them.

9. **How do you handle migrations in a production database?**  
   Version migration scripts, review them, test on representative data, back up, and use a migration runner or controlled release step. Prefer backward-compatible expand/migrate/contract changes, monitor execution, and prepare a rollback or forward-fix plan.

10. **What is a deadlock, and how do you resolve it?**  
    A deadlock occurs when transactions wait on locks held by each other in a cycle. The database aborts one participant; keep transactions short, access rows in a consistent order, index lookups, and safely retry deadlock victims with bounded backoff.

11. **What is the difference between `WHERE` and `HAVING`?**  
    `WHERE` filters rows before grouping and aggregation. `HAVING` filters groups after aggregation, for example `HAVING COUNT(*) > 2`.

12. **How do you optimize a slow query?**  
    Measure it, capture the actual query and parameters, inspect `EXPLAIN`, check row counts and indexes, and remove unnecessary columns/rows or N+1 access. Re-measure under realistic load; avoid adding indexes based only on intuition.

13. **What is a stored procedure, and when should you use one?**  
    It is database-side executable logic invoked by name. It can be useful for operations that benefit from centralized database execution or reduced round trips, but can complicate testing, versioning, portability, and application observability.

14. **What is the difference between `CHAR` and `VARCHAR`?**  
    `CHAR(n)` is fixed-width (with database-specific padding behavior), suited to consistently short fixed-size values. `VARCHAR(n)` stores variable-length strings up to a limit and is generally more suitable for names, emails, and other variable-length text.

15. **How do you back up and restore a MariaDB database?**  
    Use a consistent logical dump such as `mariadb-dump`/`mysqldump` with appropriate transaction and schema options, store it encrypted and separately from the host, and periodically test restoring it. A backup is not proven until a restore is verified.

## Docker, Images & Containers

1. **What is the difference between a Docker image and a container?**  
   An image is an immutable template containing application files and metadata. A container is a running or stopped instance of an image with its own runtime state and writable layer.

2. **What is the difference between a Dockerfile and a docker-compose file?**  
   A Dockerfile describes how to build one image. Compose describes how a group of services, networks, volumes, environment settings, and dependencies run together.

3. **What is a Docker layer, and how does caching work?**  
   Docker builds an image from layered filesystem changes. A build step can reuse cached results when its inputs and preceding layers match; order stable dependency files before frequently changed source to make cache reuse effective.

4. **What is the difference between `COPY` and `ADD` in a Dockerfile?**  
   `COPY` copies files from the build context and is preferred for ordinary file copying. `ADD` also supports features such as local archive extraction and certain remote sources; use it only when those behaviors are specifically needed.

5. **What is the difference between `CMD` and `ENTRYPOINT`?**  
   `ENTRYPOINT` defines the main executable; `CMD` supplies default arguments or a default command. Runtime arguments typically replace `CMD` and are appended to an exec-form `ENTRYPOINT`.

6. **What is a multi-stage build, and why use one?**  
   It uses separate build and runtime stages, copying only required output into the final stage. This keeps compilers and development dependencies out of production images and can reduce image size and attack surface.

7. **What is the difference between a bind mount and a volume?**  
   A bind mount maps a specific host path into a container and is convenient for development or selected host-managed files. A named volume is managed by Docker and is generally preferable for persistent container data.

8. **How do you pass environment variables to a container?**  
   Use Compose `environment`, an `env_file`, or runtime `--env-file`/`-e` configuration. Keep secrets out of source control and images; use a secret manager or Docker secrets in production.

9. **What is the difference between `EXPOSE` and `-p` (port publishing)?**  
   `EXPOSE` documents the port the image's application listens on; it does not publish it. `-p host:container` or Compose `ports` creates host access to the container port.

10. **How do containers communicate with each other in Docker Compose?**  
    Compose puts services on a network where they can resolve each other by service name and connect to the container's listening port. A backend should use the database service name (such as `mariadb`), not `localhost`.

11. **What is a Docker network, and what are the types (bridge, host, overlay)?**  
    A network connects containers and controls their reachability. Bridge networks commonly connect services on one Docker host, host networking shares the host network namespace, and overlay networks connect services across a Swarm cluster.

12. **How do you reduce the size of a Docker image?**  
    Use a suitable small base image, multi-stage builds, production-only dependencies, and a `.dockerignore` that excludes dependencies, build output, secrets, and unrelated files. Remove caches in the same layer and copy only required runtime artifacts.

13. **What happens to data when a container is deleted?**  
    Data only in the container's writable layer is removed with it. Data in a bind mount or named volume persists until that host path or volume is separately deleted.

14. **What is `.dockerignore`, and why is it important?**  
    It excludes paths from the build context sent to the Docker builder. It reduces build transfer/cache churn and helps avoid accidentally copying dependencies, secrets, or unrelated files into images.

15. **How do you debug a container that keeps crashing?**  
    Check `docker compose ps`, `docker compose logs <service>`, exit code, health checks, and the effective configuration. Verify required environment variables, filesystem permissions, dependencies, and whether the process stays in the foreground; reproduce interactively only when safe.

## Server & Deployment

1. **What is the difference between a reverse proxy and a forward proxy?**  
   A forward proxy acts for clients accessing external servers. A reverse proxy sits in front of servers and accepts client requests on their behalf, often providing routing, TLS termination, caching, and load balancing.

2. **What does Nginx do, and why put it in front of an app?**  
   Nginx can serve static files and proxy dynamic requests to application servers. It can centralize TLS, routing, compression, buffering, and access control; configure forwarded headers and limits carefully.

3. **What is the difference between HTTP and HTTPS?**  
   HTTPS is HTTP protected by TLS, which provides encryption in transit, server identity verification, and message integrity. It does not itself guarantee that an application is secure or authorized.

4. **What is a load balancer, and what algorithms does it use?**  
   A load balancer distributes requests among healthy server instances. Common approaches include round-robin, weighted round-robin, least connections, and consistent hashing; health checks and session/state strategy matter as much as the algorithm.

5. **What is the difference between a process and a thread?**  
   A process has its own virtual address space and resources. Threads are execution paths within a process that share its memory, so they communicate efficiently but require synchronization to protect shared mutable state.

6. **What is a systemd service, and how do you create one?**  
   It is a unit managed by Linux systemd for starting, stopping, restarting, and supervising a process. Define `ExecStart`, a dedicated `User`, working directory, environment source, restart policy, and security limits in a unit file, then enable and inspect it with `systemctl`.

7. **How do you deploy a Node/Python app to a Linux server?**  
   Build/test an immutable artifact or image, configure secrets outside the artifact, provision a least-privilege runtime identity, expose the service through a TLS reverse proxy, and run health checks. Add logs/metrics, backups, automated updates, and a tested rollback procedure.

8. **What is SSH, and how do you use key-based authentication?**  
   SSH provides encrypted remote login and command execution. Generate a key pair, protect the private key with permissions/passphrase, install only the public key for the intended account, and disable password/root login when operationally safe.

9. **What is a firewall, and how do you open/close ports?**  
   A firewall allows or blocks traffic based on rules. Permit only required ports and source ranges (for example, public HTTPS but not a database port), then verify rules from both host and remote perspectives.

10. **What is the difference between a staging and production environment?**  
    Staging is a production-like environment for rehearsing releases and integration; production serves real users and data. Keep credentials and data separated, and never assume staging is safe for production secrets or unmasked personal information.

11. **How do you do zero-downtime deployments?**  
    Start new healthy instances before draining old ones, use backward-compatible schema changes, and route traffic only after readiness checks. Keep state external to replaceable instances and have a rollback strategy for both code and data changes.

12. **What is CI/CD, and how does it fit into deployment?**  
    Continuous Integration automatically builds and tests changes; Continuous Delivery/Deployment packages and promotes validated artifacts, with deployment either requiring approval or happening automatically. Pipelines should use protected secrets, reproducible builds, and deployment gates.

13. **How do you monitor a server (logs, metrics, alerts)?**  
    Collect structured, access-controlled logs; metrics for latency, traffic, errors, saturation, database, and storage; and traces when request flow spans services. Alert on user-impacting symptoms and actionable thresholds, not every noisy event.

14. **What is the difference between a VM and a container?**  
    A VM virtualizes hardware and runs a separate guest operating system. A container isolates processes while sharing the host kernel, so it is usually lighter but is not a separate kernel boundary.

15. **How do you roll back a bad deployment?**  
    Route traffic to the last known-good immutable artifact, then inspect logs and data compatibility. Roll back schema changes only if they are safely reversible; otherwise deploy a corrective migration and fix forward.

## Cross-Cutting / Full-Stack

1. **How does a request flow from the browser to the database and back?**  
   The UI sends an HTTP request through routing/proxy layers; backend middleware parses, authenticates, authorizes, and validates it; a service applies business rules and queries the database; the API serializes a status and response, and the UI updates its loading/success/error state.

2. **How do you handle errors consistently across the stack?**  
   Define API error codes and a stable response schema, map known failures to suitable HTTP statuses, and keep unexpected errors in centralized logging. The frontend should translate safe error responses into clear messages while retaining diagnostic IDs where available.

3. **How do you share types between frontend and backend (TypeScript, OpenAPI)?**  
   Define an OpenAPI schema or shared TypeScript contracts in a package and generate clients/types when practical. Keep runtime validation at trust boundaries because compile-time types do not validate incoming JSON.

4. **How do you handle file uploads end-to-end?**  
   The browser sends `multipart/form-data` with progress and cancellation support; the server authenticates and validates size/type/content, stores under a generated key, and persists metadata/ownership. Return a safe reference, authorize later downloads, and handle cleanup, scanning, and retries.

5. **How do you secure an API key on the frontend?**  
   You generally cannot: any secret bundled into browser code can be extracted. Keep privileged keys on a backend and expose a narrow, authorized API; public client identifiers must be restricted by origin, scope, and quota.

6. **What is the difference between cookies, JWT, and OAuth?**  
   A cookie is a browser storage/transport mechanism; it may hold an opaque session ID or token. JWT is a token format containing signed claims, not an authentication protocol by itself. OAuth 2.0 is an authorization framework for delegated access; OpenID Connect adds an identity layer.

7. **How do you handle time zones in the database and API?**  
   Store instants consistently (commonly UTC) and transmit them with an explicit offset or `Z`; convert to the user's chosen zone only for display. For date-only values such as a birth date, store a date rather than inventing a time-zone-dependent instant.

8. **How do you test the full stack (unit, integration, e2e)?**  
   Unit-test isolated rules, integration-test routes and database behavior with realistic dependencies, and end-to-end test key user journeys in a deployed-like environment. Use deterministic fixtures, isolate test data, and assert authorization and failure cases as well as success.

9. **What is the difference between a 4xx and 5xx error, and who is responsible?**  
   A `4xx` usually means the request cannot be fulfilled because of client input, identity, or permissions; the client must correct or change the request. A `5xx` indicates server-side failure or temporary unavailability; the service owner investigates, and clients may retry only when safe.

10. **How do you debug a bug that only happens in production?**  
    Compare versions, configuration, data shape, permissions, traffic, and dependency behavior without exposing production secrets. Use correlated logs/traces, reproduce with sanitized data, assess user impact, mitigate safely, and add a regression test.

## F1KD System Study Questions

These answers describe the current repository implementation and are useful for connecting the concepts above to this application.

1. **What does F1KD do, and what are its main technical components?**  
   F1KD is a beneficiary monitoring and reporting application. Its frontend is React with Vite and React Router; its API is Node.js with Express; data is stored in MariaDB through `mysql2`; MinIO is used for document storage; and Nginx serves the production frontend.

2. **How are the frontend and backend separated in the repository and Docker setup?**  
   The frontend project and Docker build context live in `frontend/`; the API project and build context live in `server/`. Root `docker-compose.minio.yml` runs MariaDB, MinIO, backend, and web services. In local development Vite proxies `/api` to `http://localhost:4000`; in the Compose stack the browser reaches Nginx on port `8080` and Nginx proxies API requests according to its configuration.

3. **Which data domains does the backend expose?**  
   Route modules cover authentication, users, notifications, community resources (schools/communities, groups, and batches), mothers, children, programs, progress reports, and documents. The Express entry point mounts them under `/api`.

4. **What is the F1KD authentication flow?**  
   Login checks the submitted email and password against a parameterized database lookup and a bcrypt hash. The API issues a signed access JWT and an `HttpOnly`, `SameSite=Strict` refresh cookie; the frontend keeps the access token in `localStorage`, sends it as a bearer token, and attempts a cookie-based refresh after a `401`.

5. **What security detail should a developer notice in that authentication flow?**  
   The current server response includes both `token` and `refreshToken` in its JSON, even though the frontend relies on the refresh cookie. Returning a refresh credential to JavaScript weakens the protection provided by `HttpOnly`; a hardening change should stop returning it in the response and test cookie-based refresh and token expiry/revocation behavior.

6. **How are authentication and authorization enforced?**  
   Express middleware verifies bearer JWTs and attaches the decoded payload to the request. Additional authorization middleware checks roles and scopes; the frontend also has `RequireAuth` and `RoleBasedRoute` guards for user experience, but backend checks remain the security boundary.

7. **Which roles and scopes are important in F1KD?**  
   The application recognizes Super Admin, Admin, Community Coordinator, Partner, and Health Worker roles. Authorization may also use a user's `school_id` and `group_id`; scoped users should only access the records assigned to them, so tests must cover cross-school and cross-group access.

8. **What HTTP methods does F1KD use for common resource operations?**  
   Examples include `GET` for listing and reading, `POST` for creating or recording checkups, `PUT` for updates, `PATCH` for partial program actions such as ending/restoring a program, and `DELETE` for removal. Check the route module before assuming that all resources use identical method semantics.

9. **How are failures represented by the API?**  
   Many authentication and authorization responses include `status`, `code`, `message`, and an ISO timestamp; the shared Express error handler uses the same general fields. Some older route handlers still return simpler `{ error: ... }` responses, so clients should not assume every endpoint is fully standardized yet.

10. **How does F1KD limit traffic?**  
    Express applies a general rate limit to `/api` (default 100 requests per minute) and a stricter limit to `/api/auth/login` (default 5 per minute), with environment variables to configure the windows and maxima. Verify how the limiter's client identity behaves behind the actual proxy before relying on it in a multi-instance deployment.

11. **How does database access work?**  
    `server/db.js` creates a `mysql2/promise` pool with a connection limit of 10 and uses placeholders for query values. The API waits for its database initialization promise before listening; startup schema setup exists in `db.js`, while SQL migration files are also present in `server/migrations/`, so developers should establish which changes are bootstrapped and which require an explicit migration step.

12. **How are documents stored?**  
    Upload middleware uses Multer, enforces a 10 MB file-size limit, and is configured to use MinIO when storage credentials/endpoint are configured; it also has a local disk fallback under `server/data/uploads`. A production review should verify accepted content types, file signature checks, generated object names, download authorization, backup, and cleanup behavior.

13. **What is special about F1KD's child-growth calculations?**  
    The application includes WHO child-growth reference data and a calculator in both the frontend and backend project trees. The core calculation checks age eligibility (up to 731 days) and derives z-scores/interpretations from LMS references; because there are two copies, a standards update must keep them synchronized and be checked with matching tests.

14. **How is Docker data persisted in the local stack?**  
    Compose uses named volumes `mariadb-data` and `minio-data`, and a bind mount for backend local-upload files. `docker compose down` keeps named volumes; `docker compose down -v` removes them and can erase the database and MinIO data.

15. **Which ports are intended to be reachable from the host?**  
    The web UI is exposed on host port `8080` by default. MariaDB (`3306`) and MinIO (`9000`/`9001`) are bound to loopback in the Compose file; the backend port is not published directly. Container-to-container traffic uses service names such as `mariadb` and `minio`.

16. **How should a developer debug a failed F1KD API request?**  
    Check the browser network request, response status/body, and bearer header; then inspect backend logs, route mounting, auth/role/scope middleware, request validation, and SQL parameters. For data-dependent failures, verify the related foreign keys and query results without logging credentials or sensitive beneficiary data.

17. **What should be tested when adding a new role-protected endpoint?**  
    Test unauthenticated access, every allowed and denied role, assigned and unassigned scope, cross-school/group attempts, malformed input, and database failure behavior. Also confirm that frontend route visibility agrees with (but does not replace) API enforcement.

18. **What should be tested when adding a new F1KD form field?**  
    Trace it from the React form through client validation and API payload to backend validation, database schema/migration, read/update responses, and report/export behavior. Test omitted, blank, malformed, boundary, and valid values, plus existing records that lack the new field.

19. **How should the F1KD stack be started for local development?**  
    From `frontend/`, install with `npm ci` and run `npm run dev`; from `server/`, install dependencies, configure the backend `.env`, and run `npm run dev`. The frontend Vite server proxies `/api` to port `4000`; a reachable MariaDB instance is required by the backend.

20. **How can the full F1KD Docker stack be started and checked?**  
    Configure the root `.env` from `.env.docker.example` with unique secrets, then run `docker compose -f docker-compose.minio.yml up --build -d`. Check `docker compose -f docker-compose.minio.yml ps`, service logs, the backend `/api/health` health check, and `http://localhost:8080`; back up database and document data before moving hosts or removing volumes.

21. **What are sensible areas for future F1KD study or improvement?**  
    Study consistent validation/error contracts, safer refresh-token handling, restrictive production CORS, rejecting a missing production JWT secret instead of relying on a development fallback, automated/verified migration workflows, upload content-signature checks, end-to-end permission tests, query/index profiling, accessible form feedback, and documented backup/restore drills. Treat these as review topics: confirm current behavior and deployment requirements before changing production policy.
