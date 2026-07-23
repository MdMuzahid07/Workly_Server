# 🧪 Workly-Job Backend — API Automated Testing & Quality Assurance Guide

Welcome to the **Workly-Job** backend API testing documentation. This guide explains the automated testing setup, Postman collection architecture, performance reporting, and guidelines for future developers extending or maintaining the codebase.

---

## 📌 1. Architecture Overview

The API testing system is designed to provide end-to-end (E2E) integration coverage, performance benchmarking, and regression testing for the **PERN stack backend (`Workly_Server`)**.

### Key Components:

- **Postman Collection (`postman/workly-job.postman_collection.json`)**: Contains 170+ requests organized across **17 feature modules**, covering all 4 user roles (`JOB_SEEKER`, `EMPLOYER`, `ADMIN`, `SUPER_ADMIN`).
- **Postman Environment (`postman/workly-job.postman_environment.json`)**: Local environment configuration (`http://localhost:5000/api/v1`) with dynamic JWT secret placeholders.
- **Automated Test Runner (`postman/run-tests.js`)**: Uses Newman's **programmatic API** (not CLI shell-out) with retry-based health checks, proper exit code propagation, and structured summary output.
- **Interactive Reports (`postman/reports/`)**: Auto-generated dark-mode HTML & JSON benchmark reports detailing response latency, HTTP status codes, and test assertions.
- **CI/CD Pipeline (`.github/workflows/api-tests.yml`)**: Production-grade GitHub Actions workflow with SHA-pinned actions, concurrency control, timeout limits, and automated report artifact uploads.

---

## 🔑 2. Automated Token & Session Management

Every authenticated request relies on dynamic JWT tokens (`access_token` and `refresh_token`).

### Token Auto-Extraction Script

The `Register User` and `Login User` requests in folder `01. Auth` include an automated Postman test script:

```javascript
if (pm.response.code === 200 || pm.response.code === 201) {
  var jsonData = pm.response.json();
  if (jsonData && jsonData.data && jsonData.data.accessToken) {
    pm.environment.set('access_token', jsonData.data.accessToken);
  }
  if (jsonData && jsonData.data && jsonData.data.refreshToken) {
    pm.environment.set('refresh_token', jsonData.data.refreshToken);
  }
}
```

> **Developer Note**: You do **not** need to manually copy-paste Bearer tokens when running requests in Postman or Newman. Running `Register` or `Login` automatically populates `{{access_token}}` across all subsequent folder requests.

---

## 🚀 3. How to Run API Tests Locally

### Prerequisites

Make sure PostgreSQL and Node.js are running natively on your local machine.

### Step 1: Start the Backend Server

In your primary terminal tab:

```bash
cd Web/Workly_Server
pnpm dev
```

_(Server will start on `http://localhost:5000`)_

### Step 2: Run the Automated Test Suite

In a second terminal tab:

```bash
cd Web/Workly_Server
pnpm test:api
```

### What Happens Under the Hood

1. The runner polls `http://localhost:5000/api/v1/public/status/health` with retry (up to 15 attempts × 2s = 30s max).
2. Once the server is confirmed healthy, Newman executes the full collection programmatically.
3. A structured summary is printed showing requests, assertions, average response time, and duration.
4. Reports are saved to `postman/reports/`.
5. **Exit code 1** is returned if any assertions or requests fail — ensuring CI pipelines correctly detect failures.

---

## 📊 4. Understanding Test & Performance Reports

When `pnpm test:api` finishes, reports are saved to `Web/Workly_Server/postman/reports/`:

1. **`workly-report-<timestamp>.html`**:
   - **Passed vs Failed Breakdown**: Visual pie charts and breakdown by module.
   - **Performance Latency**: Response speed (in `ms`) for every endpoint.
   - **Payload Inspector**: Full request/response JSON payloads, headers, and HTTP status codes.
   - **Opening Report**: `xdg-open postman/reports/workly-report-*.html` (Linux) or open in any browser.

2. **`summary-<timestamp>.json`**:
   - Programmatic execution metrics for performance tracking.

---

## 📂 5. Postman Collection Structure (17 Modules)

| Folder                      | Scope                      | Description                                                                 |
| :-------------------------- | :------------------------- | :-------------------------------------------------------------------------- |
| `01. Auth`                  | Public / Seeker / Employer | Registration, login, token refresh, password resets, Google OAuth           |
| `02. Users & Account`       | Seeker / Employer          | Push token registration, notification preferences, account deletion         |
| `03. Profile`               | Job Seeker                 | Profile CRUD, saved job bookmarks, privacy settings                         |
| `04. Profile Sub-Resources` | Job Seeker                 | Education, Work Experience, Certifications, Portfolio Projects              |
| `05. Resume Management`     | Job Seeker                 | Multipart PDF uploads, default resume settings, PDF streaming               |
| `06. Company Management`    | Employer / Public          | Company profile CRUD, team members, employer analytics                      |
| `07. Category & Industry`   | Public / Admin             | Job category listings, admin CRUD, statistics                               |
| `08. Job Listings`          | Public / Employer / Seeker | Job posting, search filtering, autocomplete suggestions, AI recommendations |
| `09. Applications (ATS)`    | Seeker / Employer          | Job applications, candidate pool management, interview scheduling           |
| `10. Candidate Discovery`   | Employer                   | Candidate directory search, bookmarking, filter facets                      |
| `11. Follow & Interactions` | Seeker / Employer          | Following companies, profile view logs, job view history                    |
| `12. Messaging System`      | Seeker / Employer          | Real-time conversations, text messages, file attachments                    |
| `13. Notifications`         | All Roles                  | Push/system notifications, unread counters, batch read                      |
| `14. Plans & Subscriptions` | Public / Admin / Employer  | Tiered plans, active subscriptions, admin manual assignments                |
| `15. Payments & Billing`    | Public / Employer / Admin  | SSLCommerz checkout initialization, webhooks (IPN, Success, Fail, Cancel)   |
| `16. System & Public`       | Public / Admin             | System status, health check, legal docs, image/avatar file uploads          |
| `17. Admin Governance`      | Admin / SUPER_ADMIN        | User/employer suspension, job moderation, staff roles, audit logs           |

---

## ⚙️ 6. CI/CD Pipeline (GitHub Actions)

The workflow at [`.github/workflows/api-tests.yml`](.github/workflows/api-tests.yml) runs automatically on push/PR to `main`, `master`, or `develop` branches. This file lives inside the `Workly_Server` repository root — each project (server, client, mobile) has its own independent GitHub repo and CI pipeline.

### Pipeline Features:

| Feature            | Implementation                                                 |
| :----------------- | :------------------------------------------------------------- |
| **Security**       | All actions pinned to full commit SHAs (supply-chain hardened) |
| **Permissions**    | `contents: read` only (least privilege)                        |
| **Concurrency**    | `cancel-in-progress: true` — saves free-tier minutes           |
| **Timeout**        | `timeout-minutes: 15` — prevents runaway billing               |
| **Path Filtering** | Only triggers on `Web/Workly_Server/**` changes                |
| **Database**       | Fresh PostgreSQL 17 service container per run                  |
| **Build**          | `pnpm build` compiles TypeScript before `pnpm start`           |
| **Health Check**   | Polls health endpoint in a loop (no blind `sleep`)             |
| **Artifacts**      | HTML/JSON reports uploaded, retained for 14 days               |

### GitHub Free Tier:

- **Public repos**: Unlimited free minutes.
- **Private repos**: 2,000 free minutes/month. This workflow uses ~2 min per run.

---

## 🔄 7. Guidelines for Future Developers

When modifying or adding new API endpoints to `Workly_Server`:

1. **Update Zod Validation Mock Data**: If you add fields to a Zod schema in `*.validation.ts`, update the raw request body in `postman/workly-job.postman_collection.json`.
2. **Keep Role Scopes Clean**: Always add the `Authorization: Bearer {{access_token}}` header for protected routes.
3. **Do NOT Commit HTML Reports**: The `postman/reports/*.html` pattern is intentionally gitignored in `.gitignore`. Commit only `workly-job.postman_collection.json`, `workly-job.postman_environment.json`, `run-tests.js`, and `reports/.gitkeep`.
4. **CI/CD Integration**: The pipeline at `.github/workflows/api-tests.yml` runs automatically — no manual setup required.
5. **Exit Codes**: The test runner exits with code 1 on any failure. Never suppress errors in `run-tests.js`.

---

_Maintained by the Workly-Job Engineering Team._
