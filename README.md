# 🏢 WorklyJob Enterprise Backend Core Engine

[![Node.js](https://img.shields.io/badge/Node.js-v24.0%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.1%2B-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma_ORM-v7.9%2B-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.9%2B-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-v4.8%2B-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![pnpm](https://img.shields.io/badge/pnpm-v11.11%2B-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Postman](https://img.shields.io/badge/Postman_Newman-v6.2%2B-FF6C37?style=for-the-badge&logo=postman&logoColor=white)](https://www.postman.com/)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](https://github.com/features/actions)

Welcome to the **WorklyJob Enterprise Core Engine** — a production-grade, highly scalable backend ecosystem designed to power next-generation recruitment networks, Applicant Tracking Systems (ATS), real-time candidate communications, and automated subscription billing.

Architected with a clean, modular TypeScript design pattern, the server integrates **Express 5**, **Prisma ORM 7**, **PostgreSQL 17**, **Socket.IO 4**, and enterprise payment gateways (**SSLCommerz**).

---

## =============================================================================

## 🏗️ System Architecture & Engineering Patterns

## =============================================================================

The server adopts a strict **Layered Modular Architecture** with decoupled domain logic:

```mermaid
graph TD
    Client[Client Applications - Web / Mobile] <-->|HTTP / REST JSON| Router[Express Router Gateway]
    Client <-->|WebSockets / Socket.IO| SocketServer[Socket.IO Gateway]

    subgraph Express Application Core
        Router --> Security[Helmet / CORS / Rate Limiter]
        Security --> Auth[JWT & RBAC Middleware]
        Auth --> Validation[Zod Schema Validator]
        Validation --> Controller[Module Controllers]
        Controller --> Service[Business Logic Services]
      end

    subgraph Data & Integration Infrastructure
        Service --> Prisma[Prisma ORM 7 Client]
        Prisma --> DB[(PostgreSQL 17 Database)]
        Service --> SMTP[Nodemailer / SMTP Email Engine]
        Service --> Cloudinary[Cloudinary CDN / Local File System]
        Service --> SSLCommerz[SSLCommerz IPN & Payment Gateway]
        Service --> PushSDK[Expo Push Notification SDK]
    end

    subgraph Background Automation
        CronEngine[Node-Cron Scheduler] --> ExpiryJob[Subscription Expiry Sweeper]
        CronEngine --> ReminderJob[Subscription Renewal Reminders]
        CronEngine --> ReconcileJob[Payment Reconciliation Sweeper]
        CronEngine --> PushJob[Push Notification Receipt Checker]
    end
```

### Module Design Pattern

Every domain feature (e.g. `auth`, `job`, `application`, `payment`, `subscription`) is completely self-contained within its feature module in `src/app/modules/`:

1. **`*.route.ts`**: Defines HTTP route handlers, schema-based request validation middlewares, and Role-Based Access Control (RBAC) scopes (`JOB_SEEKER`, `EMPLOYER`, `ADMIN`, `SUPER_ADMIN`).
2. **`*.controller.ts`**: Decouples HTTP request/response parsing from business logic, utilizing a unified payload envelope (`sendResponse`).
3. **`*.service.ts`**: Contains pure core business logic, transactional Prisma database queries, external payment gateway calls, and background event triggers.
4. **`*.validation.ts`**: Enforces strict compile-time and runtime Zod validation schemas to reject invalid payloads at the gateway layer before execution.

---

## =============================================================================

## 🗄️ Database Schema & Entity Map (43 Models, 17 Enums)

## =============================================================================

The data access layer manages **43 database entities** and **17 custom enums** in PostgreSQL via Prisma ORM:

### 1. Database Enum Directory

- **`UserRole`**: `JOB_SEEKER`, `EMPLOYER`, `ADMIN`, `SUPER_ADMIN`
- **`ProfileVisibility`**: `PUBLIC`, `PRIVATE`
- **`JobType`**: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP`, `FREELANCE`, `REMOTE`
- **`JobStatus`**: `DRAFT`, `ACTIVE`, `CLOSED`, `EXPIRED`
- **`JobSkillPriority`**: `HIGH`, `MEDIUM`, `LOW`, `GOOD_TO_HAVE`
- **`ApplicationStatus`**: `SUBMITTED`, `REVIEWING`, `SHORTLISTED`, `INTERVIEWED`, `REJECTED`, `OFFERED`, `ACCEPTED`, `WITHDRAWN`
- **`PreferredContactMethod`**: `EMAIL`, `PHONE`, `BOTH`
- **`TokenType`**: `EMAIL_VERIFICATION`, `PASSWORD_RESET`, `TWO_FACTOR_AUTH`, `LOGIN_MAGIC_LINK`
- **`SubscriptionStatus`**: `ACTIVE`, `PAST_DUE`, `CANCELED`, `EXPIRED`, `TRIALING`
- **`InvoiceStatus`**: `PAID`, `UNPAID`, `OVERDUE`, `REFUNDED`
- **`MessageStatus`**: `SENT`, `DELIVERED`, `READ`, `FAILED`, `DELETED`
- **`MessageType`**: `TEXT`, `IMAGE`, `FILE`, `LINK`
- **`ReportSeverity`**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- **`ReportStatus`**: `OPEN`, `PENDING`, `RESOLVED`, `DISMISSED`
- **`PaymentStatus`**: `PENDING`, `VALIDATED`, `PENDING_REVIEW`, `FAILED`, `CANCELLED`
- **`PaymentCategory`**: `EMPLOYER_PLAN`, `SEEKER_PREMIUM`

---

### 2. Entity Model Schema Map

| Module Category         | Model Name                | Primary Purpose & Responsibilities                             | Core Relations                                      |
| :---------------------- | :------------------------ | :------------------------------------------------------------- | :-------------------------------------------------- |
| **Identity & Security** | `User`                    | User credentials, account state, and role bindings             | `Profile`, `Company`, `Applications`, `Resumes`     |
|                         | `UserSettings`            | Notification preferences, privacy & profile visibility toggles | `User`                                              |
|                         | `VerificationToken`       | Verification tokens, password resets, and magic links          | `User`                                              |
| **Seeker Profiles**     | `Profile`                 | Comprehensive candidate profile & portfolio repository         | `User`, `Education`, `WorkExperience`, `Skills`     |
|                         | `Education`               | Degree records, institutions, and graduation metrics           | `Profile`                                           |
|                         | `WorkExperience`          | Employment history, positions, and achievements                | `Profile`                                           |
|                         | `Certification`           | Professional credentials, licenses, and expiration             | `Profile`                                           |
|                         | `Skill`                   | Candidate competencies and proficiency levels                  | `Profile`                                           |
|                         | `Project`                 | Personal projects, links, and code repositories                | `Profile`                                           |
|                         | `Preference`              | Target job locations, salary ranges, and job types             | `Profile`                                           |
|                         | `Resume`                  | PDF resume management (Cloudinary / local fallback)            | `User`                                              |
|                         | `Address`                 | Physical location details for candidates and companies         | `Profile`                                           |
|                         | `Volunteer`               | Community leadership and volunteering logs                     | `Profile`                                           |
|                         | `Award`                   | Professional honors, grants, and awards                        | `Profile`                                           |
|                         | `Publication`             | Academic journals and editorial publications                   | `Profile`                                           |
|                         | `Reference`               | Professional reference contacts                                | `Profile`                                           |
|                         | `Language`                | Spoken and written language proficiencies                      | `Profile`                                           |
| **Enterprise & Jobs**   | `Company`                 | Business profiles, corporate branding, and size                | `User`, `Jobs`, `Subscription`, `Invoices`          |
|                         | `Benefits`                | Perks offered by employers or tied to specific jobs            | `Company`, `Job`                                    |
|                         | `SocialLink`              | Corporate social media channels                                | `Company`                                           |
|                         | `Industry`                | Industry/Category tags with unique slugs                       | `Company`, `Job`                                    |
|                         | `CompanySettings`         | Notification & direct message preferences                      | `Company`                                           |
|                         | `Job`                     | Job vacancy listings, requirements, and constraints            | `Company`, `User`, `Applications`, `JobSkill`       |
|                         | `JobSkill`                | Target competencies prioritized for a job                      | `Job`                                               |
| **ATS Recruitment**     | `Application`             | Pipeline application linking Candidate to Job                  | `User`, `Job`, `Notification`, `Conversation`       |
|                         | `SavedJob`                | Job seeker bookmarks                                           | `User`, `Job`                                       |
|                         | `SavedCandidate`          | Employer candidate bookmarks                                   | `User` (Employer), `User` (Candidate)               |
| **Live Chat**           | `Conversation`            | Messaging thread container                                     | `Message`, `ConversationParticipant`, `Application` |
|                         | `ConversationParticipant` | Links user participants to active conversations                | `Conversation`, `User`                              |
|                         | `Message`                 | Text, image, or document message nodes                         | `Conversation`, `User`                              |
| **Billing & Payments**  | `Plan`                    | Price tier plans, features, limits                             | `Subscription`                                      |
|                         | `Subscription`            | Subscriptions assigned to Companies or Seekers                 | `Company`, `Plan`, `Invoice`                        |
|                         | `Invoice`                 | Core subscription invoice receipts                             | `Company`, `Subscription`                           |
|                         | `PaymentTransaction`      | SSLCommerz checkout transactions                               | `User`, `Company`                                   |
| **Analytics & System**  | `Notification`            | System notifications and push payload records                  | `User`, `Job`, `Application`                        |
|                         | `ProfileView`             | Analytics tracking profile views                               | `User` (Viewer), `User` (Viewed)                    |
|                         | `JobView`                 | Analytics tracking job vacancy traffic                         | `Job`, `User`                                       |
|                         | `Follow`                  | Company followers registry                                     | `User`, `Company`                                   |
|                         | `AuditLog`                | Platform operational logs                                      | `User`                                              |
|                         | `RateLimit`               | API throttling security logs                                   | -                                                   |
|                         | `LegalDocument`           | Privacy policies and terms of service                          | -                                                   |
|                         | `JobReport`               | Abuse flag registries for jobs                                 | `Job`, `User`                                       |
|                         | `SystemSettings`          | Control maintenance mode & system toggles                      | -                                                   |

---

## =============================================================================

## ⚙️ Background Automation Jobs (Cron Sweepers)

## =============================================================================

The server runs 4 automated background cron tasks via `node-cron` to maintain system state:

| Job Name                           | Schedule          | Purpose & Action                                                                                 |
| :--------------------------------- | :---------------- | :----------------------------------------------------------------------------------------------- |
| **Push Receipt Checker**           | Every 20 minutes  | Validates Expo push notification receipts and flags inactive device push tokens.                 |
| **Subscription Expiry Sweeper**    | Daily at 02:00 AM | Sweeps expired subscriptions, shifts state to `EXPIRED`, and downgrades account tiers.           |
| **Subscription Renewal Reminder**  | Daily at 08:00 AM | Sends transactional email notifications to users whose plans expire within 3 days.               |
| **Payment Reconciliation Sweeper** | Every 6 hours     | Reconciles unconfirmed SSLCommerz transactions via IPN/API query to prevent orphan transactions. |

---

## =============================================================================

## 🔌 Real-Time Communications (Socket.IO Engine)

## =============================================================================

The server mounts a full-duplex **Socket.IO** server on top of HTTP to handle live chat messaging and instant notifications.

### Authentication & Connection

- **Handshake Protocol**: Requires a valid JWT access token passed via query parameter or authorization headers: `io('http://localhost:5000', { query: { token: 'ACCESS_TOKEN' } })`.

### Supported Event Schema

```json
// Emitted by Client to Join Conversation Room
"join_room": { "conversationId": "uuid-string" }

// Emitted by Client to Send Message
"send_message": {
  "conversationId": "uuid-string",
  "content": "Hello, I am ready for the interview!",
  "messageType": "TEXT"
}

// Broadcasted by Server to Room Members
"new_message": {
  "id": "uuid-string",
  "senderId": "uuid-string",
  "content": "Hello, I am ready for the interview!",
  "createdAt": "2026-07-23T12:00:00.000Z"
}

// Broadcasted by Server for Real-Time System Alerts
"notification_received": {
  "id": "uuid-string",
  "title": "Application Shortlisted",
  "type": "APPLICATION_STATUS_CHANGE"
}
```

---

## =============================================================================

## 🧪 Quality Assurance & E2E Automated Testing

## =============================================================================

The backend includes a production-grade automated Postman test suite covering **170+ REST endpoints** across **17 feature modules**:

```
Web/Workly_Server/
├── postman/
│   ├── workly-job.postman_collection.json  # 170+ requests with pre-request token automation
│   ├── workly-job.postman_environment.json # Environment configuration (base_url, tokens)
│   ├── run-tests.js                         # Headless Newman runner script
│   └── reports/                             # Auto-generated dark-theme HTML & JSON reports
```

### Running Tests Locally

Ensure the local backend server is running, then execute:

```bash
cd Web/Workly_Server
pnpm test:api
```

The runner will:

1. Poll `http://localhost:5000/api/v1/public/status/health` with backoff retry (up to 30s) until healthy.
2. Execute the entire Postman collection programmatically via Newman.
3. Automatically populate JWT `access_token` and `refresh_token` across requests.
4. Output a summary table to the console and export an interactive dark-theme HTML report to `postman/reports/workly-report-<timestamp>.html`.

---

## =============================================================================

## 🚀 CI/CD Pipeline (GitHub Actions)

## =============================================================================

Continuous Integration is implemented via [`.github/workflows/api-tests.yml`](.github/workflows/api-tests.yml) located inside the server repository:

### CI Workflow Pipeline Steps:

1. **Trigger**: Automatically runs on `push` or `pull_request` to `main`, `master`, or `develop` branches.
2. **Service Container**: Spins up a fresh **PostgreSQL 17** Docker service container.
3. **Security Hardening**: All GitHub Actions are pinned to full 40-character commit SHAs.
4. **Build Verification**: Runs `pnpm prisma generate`, `pnpm prisma db push`, `pnpm db:seed`, and `pnpm build`.
5. **Headless Execution**: Starts the backend server, polls health status, and executes `pnpm test:api`.
6. **Artifact Storage**: Uploads HTML/JSON test reports as build artifacts (retained for 14 days).

---

## =============================================================================

## 🛠️ Environment Variables Reference

## =============================================================================

Create a `.env` file inside `Web/Workly_Server/` (validated at startup via Zod):

```env
# Server Runtime Configuration
NODE_ENV="development"
PORT=5000
BACKEND_URL="http://localhost:5000"
FRONTEND_URL="http://localhost:3000"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:8081"

# Database Connection (PostgreSQL 17)
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/workly_db?schema=public"

# Cryptography & JWT (Min 32 chars required)
JWT_SECRET="supersecretjwtkeyforworklytesting2026"
JWT_REFRESH_SECRET="supersecretrefreshjwtkeyforworklytesting2026"
JWT_EXPIRES_IN="1d"
JWT_REFRESH_EXPIRES_IN="7d"
COOKIE_SECRET="workly-dev-cookie-secret-REPLACE-BEFORE-PRODUCTION!"

# Password Hashing
BCRYPT_SALT_ROUNDS=13

# SSLCommerz Payment Gateway Configuration
SSLCOMMERZ_STORE_ID="testbox"
SSLCOMMERZ_STORE_PASSWD="qwerty"
SSLCOMMERZ_IS_LIVE=false

# Optional Integrations
REDIS_URL="redis://localhost:6379"            # Optional: In-memory fallback used if absent
CLOUDINARY_CLOUD_NAME="your_cloud_name"       # Optional: Local fallback used if absent
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
SMTP_HOST="smtp.gmail.com"                    # Optional: Mailer logging fallback used if absent
SMTP_PORT=587
SMTP_USER="your_email@gmail.com"
SMTP_PASS="your_app_password"
GOOGLE_CLIENT_ID="your_google_client_id"       # Optional: Disabled if absent
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

---

## =============================================================================

## 💻 Local Setup & Development Guide

## =============================================================================

### Prerequisites

- **Node.js**: v24.0.0 or higher
- **pnpm**: v11.11.0 or higher
- **PostgreSQL**: v17 (Self-hosted or Docker)

### Installation Steps

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/your-username/Workly_Server.git
   cd Workly_Server
   ```

2. **Install Dependencies**:

   ```bash
   pnpm install
   ```

3. **Set Up Environment Variables**:

   ```bash
   cp .env.example .env
   # Edit .env with your local PostgreSQL database credentials
   ```

4. **Initialize Database Schema & Seed Initial Data**:

   ```bash
   pnpm prisma generate
   pnpm prisma db push
   pnpm db:seed
   ```

5. **Start Development Server**:

   ```bash
   pnpm dev
   ```

   _Runs `tsx watch` for instant hot-reloading alongside Prisma Studio on `http://localhost:5555`._

6. **Build for Production**:
   ```bash
   pnpm build
   pnpm start
   ```

---

## =============================================================================

## 🛡️ Enterprise Security & Hardening Features

## =============================================================================

- **Fail-Fast Startup Validation**: Zod schema verifies all environment secrets before database or server startup occurs.
- **OWASP Bcrypt Hashing**: Passwords hashed with 13 salt rounds (`2^13` iterations).
- **HTTP Security Headers**: Enforced using `helmet` security suite.
- **CORS Exact-Origin Protection**: Substring and wildcard origin matching strictly disabled.
- **Rate Limiting**: Throttles API endpoints via `express-rate-limit` with Redis store or fallback in-memory store.
- **Query Timeout Guards**: Statement and transaction timeouts set at 15,000ms to prevent stuck database queries.

---

## =============================================================================

## 📄 License

## =============================================================================

This project is proprietary and confidential. Maintained by the **WorklyJob Engineering Team**. All rights reserved.
