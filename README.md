# WorklyJob Enterprise Backend Core Engine

Welcome to the **WorklyJob Enterprise Core Engine**—a robust, highly scalable, and production-grade backend ecosystem designed to power next-generation recruitment networks. This server is meticulously architected using a modular TypeScript design pattern, integrating **Express**, **Prisma ORM**, **PostgreSQL**, **Socket.IO**, and enterprise billing gateways (**SSLCommerz**).

---

## 🏗️ System Architecture

The core server adopts a clean, layered architectural pattern, enforcing strict separation of concerns:

```mermaid
graph TD
    Client[Web Client] <-->|HTTP / REST| Router[Express Router]
    Client <-->|WebSockets| SocketServer[Socket.IO Server]

    subgraph Express Application Layer
        Router --> Middleware[Security & Auth Validation Middleware]
        Middleware --> Controller[Module Controllers]
        Controller --> Service[Business Logic Services]
    end

    subgraph Data & Integration Layer
        Service --> Prisma[Prisma Client ORM]
        Prisma --> DB[(PostgreSQL Database)]
        Service --> SMTP[Nodemailer / SMTP]
        Service --> Cloudinary[Cloudinary CDN]
        Service --> SSLCommerz[SSLCommerz API]
    end
```

### Module Layering Structure

Every domain entity (e.g., `auth`, `job`, `application`, `payment`) is self-contained within its own feature module inside `src/app/modules/`:

1. **`<entity>.route.ts`**: Maps HTTP methods to controllers, defining schema-based validation middlewares and role protection scopes.
2. **`<entity>.controller.ts`**: Orchestrates incoming requests, formats data, and handles outbound HTTP responses using a unified payload interface.
3. **`<entity>.service.ts`**: Implements transactional queries, database operations via Prisma, third-party integrations, and core business models.
4. **`<entity>.validation.ts`**: Declares rigorous Zod schemas to reject invalid payloads at the gateway layer.

---

## 🗄️ Database Architecture (43 Models)

The system manages **43 database entities** and **17 custom enums** inside PostgreSQL via Prisma. Here is an overview of the relational structure:

### 1. Enums Directory

- `UserRole`: `JOB_SEEKER`, `EMPLOYER`, `ADMIN`, `SUPER_ADMIN`
- `ProfileVisibility`: `PUBLIC`, `PRIVATE`
- `JobType`: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP`, `FREELANCE`, `REMOTE`
- `JobStatus`: `DRAFT`, `ACTIVE`, `CLOSED`, `EXPIRED`
- `JobSkillPriority`: `HIGH`, `MEDIUM`, `LOW`, `GOOD_TO_HAVE`
- `ApplicationStatus`: `SUBMITTED`, `REVIEWING`, `SHORTLISTED`, `INTERVIEWED`, `REJECTED`, `OFFERED`, `ACCEPTED`, `WITHDRAWN`
- `PreferredContactMethod`: `EMAIL`, `PHONE`, `BOTH`
- `TokenType`: `EMAIL_VERIFICATION`, `PASSWORD_RESET`, `TWO_FACTOR_AUTH`, `LOGIN_MAGIC_LINK`
- `SubscriptionStatus`: `ACTIVE`, `PAST_DUE`, `CANCELED`, `EXPIRED`, `TRIALING`
- `InvoiceStatus`: `PAID`, `UNPAID`, `OVERDUE`, `REFUNDED`
- `MessageStatus`: `SENT`, `DELIVERED`, `READ`, `FAILED`, `DELETED`
- `MessageType`: `TEXT`, `IMAGE`, `FILE`, `LINK`
- `ReportSeverity`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `ReportStatus`: `OPEN`, `PENDING`, `RESOLVED`, `DISMISSED`
- `PaymentStatus`: `PENDING`, `VALIDATED`, `PENDING_REVIEW`, `FAILED`, `CANCELLED`
- `PaymentCategory`: `EMPLOYER_PLAN`, `SEEKER_PREMIUM`

---

### 2. Entity Model Schema Map

| Category                     | Model Name                | Primary Responsibility                                                | Core Relations                                         |
| :--------------------------- | :------------------------ | :-------------------------------------------------------------------- | :----------------------------------------------------- |
| **Identity & Access**        | `User`                    | Stores credentials, verification states, and connects active roles.   | `Profile`, `Company`, `Applications`, `Resumes`        |
|                              | `UserSettings`            | Manages seeker notifications, profile visibility and privacy toggles. | `User`                                                 |
|                              | `VerificationToken`       | Tracks verification and password reset credentials.                   | `User`                                                 |
| **Seeker Professional Data** | `Profile`                 | Main professional portfolio profile for Seekers.                      | `User`, `Education`, `WorkExperience`, `Skills`        |
|                              | `Education`               | Seeker educational degree and year details.                           | `Profile`                                              |
|                              | `WorkExperience`          | Candidate professional employment registry.                           | `Profile`                                              |
|                              | `Certification`           | Certifications, licenses, and validity metrics.                       | `Profile`                                              |
|                              | `Skill`                   | Specialized skills linked to Candidate profile.                       | `Profile`                                              |
|                              | `Project`                 | Personal projects, links, and repositories.                           | `Profile`                                              |
|                              | `Preference`              | Seeker location targets, salary goals, and roles.                     | `Profile`                                              |
|                              | `Resume`                  | Uploaded PDF resumes stored in Cloudinary.                            | `User`                                                 |
|                              | `Address`                 | Core physical location details.                                       | `Profile`                                              |
|                              | `Volunteer`               | Seeker volunteering experience logs.                                  | `Profile`                                              |
|                              | `Award`                   | Honors, grants, and award registries.                                 | `Profile`                                              |
|                              | `Publication`             | Academic and editorial publications.                                  | `Profile`                                              |
|                              | `Reference`               | Candidate professional references.                                    | `Profile`                                              |
|                              | `Language`                | Spoken and written language proficiencies.                            | `Profile`                                              |
| **Enterprise & Vacancy**     | `Company`                 | Registered business profile, size, and branding.                      | `User`, `Jobs`, `Subscription`, `Invoices`             |
|                              | `Benefits`                | Employer-provided perks linked to company or job.                     | `Company`, `Job`                                       |
|                              | `SocialLink`              | Corporate social link directories.                                    | `Company`                                              |
|                              | `Industry`                | Industry/Category tags with unique slugs.                             | `Company`, `Job`                                       |
|                              | `CompanySettings`         | Notification and direct messaging configuration.                      | `Company`                                              |
|                              | `Job`                     | Vacancy listings, location limits, and requirements.                  | `Company`, `User` (poster), `Applications`, `JobSkill` |
|                              | `JobSkill`                | Target competencies prioritized for a job.                            | `Job`                                                  |
| **Recruitment Funnel**       | `Application`             | Pipeline application connecting Candidate and Job.                    | `User`, `Job`, `Notification`, `Conversation`          |
|                              | `SavedJob`                | Seeker job bookmarks.                                                 | `User`, `Job`                                          |
|                              | `SavedCandidate`          | Employer candidate bookmarks.                                         | `User` (employer), `User` (candidate)                  |
| **Live Chat**                | `Conversation`            | Messaging thread container.                                           | `Message`, `ConversationParticipant`, `Application`    |
|                              | `ConversationParticipant` | Links user participants to conversations.                             | `Conversation`, `User`                                 |
|                              | `Message`                 | Text, image, or document message nodes.                               | `Conversation`, `User` (sender)                        |
| **Billing & Payments**       | `Plan`                    | Price tier plans, feature matrices, limits.                           | `Subscription`                                         |
|                              | `Subscription`            | Subscriptions assigned to Companies.                                  | `Company`, `Plan`, `Invoice`                           |
|                              | `Invoice`                 | Core subscription invoice receipts.                                   | `Company`, `Subscription`                              |
|                              | `PaymentTransaction`      | SSLCommerz billing checkouts.                                         | `User`, `Company`                                      |
| **Analytics & Platform**     | `Notification`            | System and push notifications.                                        | `User`, `Job`, `Application`                           |
|                              | `ProfileView`             | Job seeker profile click analytics.                                   | `User` (viewer), `User` (viewed)                       |
|                              | `JobView`                 | Job listing views and traffic tracking.                               | `Job`, `User`                                          |
|                              | `Follow`                  | Seeker-to-company followers registry.                                 | `User`, `Company`                                      |
|                              | `AuditLog`                | Platform-wide operational logs.                                       | `User`                                                 |
|                              | `RateLimit`               | API endpoint throttling and security logs.                            | -                                                      |
|                              | `LegalDocument`           | Markdown privacy policies and terms of service.                       | -                                                      |
|                              | `JobReport`               | Abuse flag registries for jobs.                                       | `Job`, `User` (reporter)                               |
|                              | `SystemSettings`          | Control maintenance mode, AI logic toggles.                           | -                                                      |

---

## ⚡ REST API Endpoint Specification

All endpoints reside under the base path `/api/v1`.

### 1. Authentication (`/auth`)

#### `POST /auth/register`

- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "seeker@worklyjob.com",
    "password": "SecurePassword123!",
    "fullName": "Muzahid Islam",
    "role": "JOB_SEEKER"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "User registered successfully! Verification email sent.",
    "data": {
      "id": "u4f9b8c0-82a1-432d-9df9-34b86cf01822",
      "email": "seeker@worklyjob.com",
      "fullName": "Muzahid Islam",
      "role": "JOB_SEEKER",
      "isVerified": false
    }
  }
  ```

#### `POST /auth/login`

- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "seeker@worklyjob.com",
    "password": "SecurePassword123!"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "u4f9b8c0-82a1-432d-9df9-34b86cf01822",
        "email": "seeker@worklyjob.com",
        "role": "JOB_SEEKER",
        "fullName": "Muzahid Islam"
      }
    }
  }
  ```

#### `GET /auth/me`

- **Access**: Authenticated User (Bearer Token)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "User details fetched successfully",
    "data": {
      "id": "u4f9b8c0-82a1-432d-9df9-34b86cf01822",
      "email": "seeker@worklyjob.com",
      "fullName": "Muzahid Islam",
      "role": "JOB_SEEKER",
      "isVerified": true,
      "profile": {
        "id": "p1a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6",
        "bio": "Software Developer specialized in PERN stacks",
        "location": "Dhaka, Bangladesh"
      }
    }
  }
  ```

---

### 2. Jobs (`/job`)

#### `POST /job/create`

- **Access**: Employer / Admin
- **Request Body**:
  ```json
  {
    "title": "Senior React Engineer",
    "discipline": "Software Engineering",
    "description": "We are seeking a senior React engineer...",
    "jobType": "FULL_TIME",
    "location": "Dhaka, Bangladesh",
    "experienceLevel": "Senior-level",
    "isRemote": true,
    "salaryMin": 120000,
    "salaryMax": 160000,
    "currency": "BDT",
    "requirements": ["5+ years React experience", "Knowledge of Tailwind v4"],
    "companyId": "c9a0b1c2-d3e4-5f6g-7h8i-9j0k1l2m3n4o",
    "skills": [
      { "skillName": "React", "experienceYears": 5, "priority": "HIGH" },
      { "skillName": "TypeScript", "experienceYears": 3, "priority": "MEDIUM" }
    ]
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Job vacancy listed successfully!",
    "data": {
      "id": "j9a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6",
      "title": "Senior React Engineer",
      "slug": "senior-react-engineer-178013",
      "status": "ACTIVE",
      "createdAt": "2026-05-30T10:14:00.000Z"
    }
  }
  ```

#### `GET /job/jobs`

- **Access**: Public
- **Query Parameters**: `page`, `limit`, `search`, `jobType`, `location`, `isRemote`, `industry`, `experienceLevel`, `salaryMin`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Jobs retrieved successfully",
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 48
    },
    "data": [
      {
        "id": "j9a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6",
        "title": "Senior React Engineer",
        "jobType": "FULL_TIME",
        "location": "Remote",
        "salaryMin": 120000,
        "salaryMax": 160000,
        "company": {
          "name": "Workly Enterprise Ltd",
          "logoUrl": "https://res.cloudinary.com/workly/..."
        }
      }
    ]
  }
  ```

---

### 3. Applications (`/application`)

#### `POST /application/create`

- **Access**: Job Seeker
- **Request Body**:
  ```json
  {
    "jobId": "j9a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6",
    "fullName": "Muzahid Islam",
    "email": "seeker@worklyjob.com",
    "phone": "+8801700000000",
    "coverLetter": "I am highly excited to apply for this vacancy...",
    "resumeUrl": "https://res.cloudinary.com/workly/resumes/my-resume.pdf",
    "yearsOfExperience": 4,
    "currentLocation": "Dhaka, Bangladesh"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Application submitted successfully!",
    "data": {
      "id": "a9a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6",
      "status": "SUBMITTED",
      "createdAt": "2026-05-30T10:30:00.000Z"
    }
  }
  ```

#### `PATCH /application/:id/status`

- **Access**: Employer (Owner of the vacancy)
- **Request Body**:
  ```json
  {
    "status": "SHORTLISTED",
    "rejectionReason": null
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Application pipeline status updated successfully",
    "data": {
      "id": "a9a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6",
      "status": "SHORTLISTED"
    }
  }
  ```

---

### 4. Billing & Payments (`/payments`)

#### `POST /payments/initiate`

- **Access**: Authenticated Employer / Seeker
- **Request Body**:
  ```json
  {
    "planId": "gold-employer-plan-monthly",
    "amount": 2500,
    "category": "EMPLOYER_PLAN",
    "companyId": "c9a0b1c2-d3e4-5f6g-7h8i-9j0k1l2m3n4o"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Payment checkout transaction initiated",
    "data": {
      "gatewayUrl": "https://sandbox.sslcommerz.com/gwprocess/v4/api.php?sessionKey=...",
      "tranId": "TXN_178013110903"
    }
  }
  ```

#### `POST /payments/success`

- **Access**: Public / SSLCommerz IPN
- **Request Body**: (Form-data posted by SSLCommerz server containing `tran_id`, `val_id`, `amount`, `card_type`, etc.)
- **Success Response**: Redirects candidate/employer safely to frontend payment success confirmation route (`/payment/success?id=tran_id`).

---

## 🔌 Socket.IO Real-Time Channels

Live full-duplex communication coordinates chat messages and notifications immediately.

### Emitted Events (Client to Server)

1. **`connection`**: Initiates handshake. Payload: `query: { token: 'JWT_ACCESS_TOKEN' }`.
2. **`join_room`**: Mounts a socket in a private room for conversations. Payload: `{ conversationId: "uuid" }`.
3. **`send_message`**: Sends a live message node. Payload:
   ```json
   {
     "conversationId": "uuid",
     "content": "Hey! Are we still scheduled for the interview tomorrow?",
     "messageType": "TEXT"
   }
   ```
4. **`typing`**: Signals that a user is actively typing. Payload: `{ conversationId: "uuid", isTyping: true }`.

### Listened Events (Server to Client)

1. **`new_message`**: Dispatched to room members when a message is saved. Payload matches `Message` schema.
2. **`user_typing`**: Broadcasts active typing states to other conversation participants.
3. **`notification_received`**: Broadcasts real-time action triggers (e.g. applications status shift, profile views) directly to the specific user's system channel.

---

## 🛠️ Environment Configuration

Create a `.env` file at the root of `Web/Workly_Server/`:

```env
PORT=5000
NODE_ENV=development

# Database Connection
DATABASE_URL="postgresql://postgres:root@localhost:5432/workly_db?schema=public"

# Cryptography Tokens
JWT_ACCESS_SECRET="enterprise_access_secret_token_123!"
JWT_ACCESS_EXPIRES_IN="1d"
JWT_REFRESH_SECRET="enterprise_refresh_secret_token_123!"
JWT_REFRESH_EXPIRES_IN="30d"

# Google OAuth Integration
GOOGLE_CLIENT_ID="google_client_id_key"
GOOGLE_CLIENT_SECRET="google_client_secret_key"
GOOGLE_CALLBACK_URL="http://localhost:5000/api/v1/auth/google/callback"

# SMTP Gateway Configuration
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="smtp_username"
SMTP_PASS="smtp_password"
SMTP_FROM="no-reply@worklyjob.com"

# Cloud CDN Configuration
CLOUDINARY_CLOUD_NAME="cloudinary_name"
CLOUDINARY_API_KEY="api_key_number"
CLOUDINARY_API_SECRET="api_secret_hash"

# SSLCommerz Payment Configuration
SSL_STORE_ID="store_id_number"
SSL_STORE_PASS="store_password_hash"
SSL_IS_SANDBOX=true
```

---

## 🚀 Getting Started

1. **Install dependencies**:

   ```bash
   yarn install
   ```

2. **Run database migrations**:

   ```bash
   yarn prisma-migrate
   ```

3. **Generate Prisma Client**:

   ```bash
   yarn prisma-generate
   ```

4. **Spin up local engine & studio concurrent tasks**:
   ```bash
   yarn dev
   ```

   - _Compiles TypeScript instantly using `tsx watch`._
   - _Launches Prisma Studio concurrently on `http://localhost:5555`._
