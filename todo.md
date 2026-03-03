# 📝 API Endpoint TODO List

Below is a comprehensive list of REST API endpoints grouped by feature and role based on the new schema.

## 🔐 Authentication (Public)

| Method | Endpoint                        | Description                             | Request Body                                 | Response                  |
| ------ | ------------------------------- | --------------------------------------- | -------------------------------------------- | ------------------------- |
| `POST` | `/api/auth/register`            | Register new user (job seeker/employer) | `{ email, password, fullName, phone, role }` | `{ user, token }`         |
| `POST` | `/api/auth/login`               | Login with email/password               | `{ email, password }`                        | `{ user, token }`         |
| `POST` | `/api/auth/logout`              | Logout (invalidate token)               |                                              | `{ success }`             |
| `POST` | `/api/auth/refresh-token`       | Refresh access token                    | `{ refreshToken }`                           | `{ token }`               |
| `GET`  | `/api/auth/verify-email/:token` | Verify email address                    |                                              | redirect or `{ message }` |
| `POST` | `/api/auth/forgot-password`     | Request password reset                  | `{ email }`                                  | `{ message }`             |
| `POST` | `/api/auth/reset-password`      | Reset password with token               | `{ token, newPassword }`                     | `{ message }`             |
| `GET`  | `/api/auth/me`                  | Get current authenticated user          |                                              | `{ user }`                |

## 👤 Job Seeker Profile

| Method | Endpoint                    | Description                                            | Request Body                       | Response                                                                  |
| ------ | --------------------------- | ------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------- |
| `GET`  | `/api/profile`              | Get own profile (includes all nested)                  |                                    | `{ profile, preferences, skills, education, experience, certifications }` |
| `PUT`  | `/api/profile`              | Update basic profile                                   | `{ bio, location, headline, ... }` | updated profile                                                           |
| `POST` | `/api/profile/avatar`       | Upload avatar (multipart)                              | avatar file                        | `{ avatarUrl }`                                                           |
| `POST` | `/api/profile/cover`        | Upload cover image                                     | cover file                         | `{ coverUrl }`                                                            |
| `POST` | `/api/profile/resume`       | Upload primary resume (multipart)                      | resume file                        | `{ resumeUrl }`                                                           |
| `GET`  | `/api/profile/views`        | Get profile view statistics                            |                                    | `{ totalViews, viewsOverTime }`                                           |
| `GET`  | `/api/profile/views/detail` | Get list of profile views (with viewer info if public) | query: page, limit                 | `{ views, pagination }`                                                   |

### Education

| Method   | Endpoint                     | Description      | Request Body                                                                    | Response          |
| -------- | ---------------------------- | ---------------- | ------------------------------------------------------------------------------- | ----------------- |
| `GET`    | `/api/profile/education`     | List education   |                                                                                 | `[education]`     |
| `POST`   | `/api/profile/education`     | Add education    | `{ degree, institution, fieldOfStudy, startDate, endDate, grade, description }` | new education     |
| `PUT`    | `/api/profile/education/:id` | Update education | same as above                                                                   | updated education |
| `DELETE` | `/api/profile/education/:id` | Delete education |                                                                                 | `{ success }`     |

### Work Experience

| Method   | Endpoint                      | Description       | Request Body                                                                | Response           |
| -------- | ----------------------------- | ----------------- | --------------------------------------------------------------------------- | ------------------ |
| `GET`    | `/api/profile/experience`     | List experiences  |                                                                             | `[experience]`     |
| `POST`   | `/api/profile/experience`     | Add experience    | `{ jobTitle, company, location, startDate, endDate, current, description }` | new experience     |
| `PUT`    | `/api/profile/experience/:id` | Update experience | same as above                                                               | updated experience |
| `DELETE` | `/api/profile/experience/:id` | Delete experience |                                                                             | `{ success }`      |

### Certifications

| Method   | Endpoint                          | Description          | Request Body                                                                            | Response              |
| -------- | --------------------------------- | -------------------- | --------------------------------------------------------------------------------------- | --------------------- |
| `GET`    | `/api/profile/certifications`     | List certifications  |                                                                                         | `[certification]`     |
| `POST`   | `/api/profile/certifications`     | Add certification    | `{ name, issuingOrganization, issueDate, expirationDate, credentialId, credentialUrl }` | new certification     |
| `PUT`    | `/api/profile/certifications/:id` | Update certification | same as above                                                                           | updated certification |
| `DELETE` | `/api/profile/certifications/:id` | Delete certification |                                                                                         | `{ success }`         |

### Skills

| Method   | Endpoint                  | Description  | Request Body                     | Response      |
| -------- | ------------------------- | ------------ | -------------------------------- | ------------- |
| `GET`    | `/api/profile/skills`     | List skills  |                                  | `[skill]`     |
| `POST`   | `/api/profile/skills`     | Add skill    | `{ skillName, experienceYears }` | new skill     |
| `PUT`    | `/api/profile/skills/:id` | Update skill | `{ skillName, experienceYears }` | updated skill |
| `DELETE` | `/api/profile/skills/:id` | Delete skill |                                  | `{ success }` |

### Preferences

| Method | Endpoint                   | Description         | Request Body                                                                                         | Response           |
| ------ | -------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------- | ------------------ |
| `GET`  | `/api/profile/preferences` | Get job preferences |                                                                                                      | `{ preference }`   |
| `PUT`  | `/api/profile/preferences` | Update preferences  | `{ jobType, expectedSalary, preferredLocation, remoteWork, industry, workExperience, availability }` | updated preference |

### Resume Manager

| Method   | Endpoint                   | Description                   | Request Body            | Response      |
| -------- | -------------------------- | ----------------------------- | ----------------------- | ------------- |
| `GET`    | `/api/resumes`             | List all uploaded resumes     |                         | `[resume]`    |
| `POST`   | `/api/resumes`             | Upload new resume (multipart) | resume file, isDefault? | new resume    |
| `PUT`    | `/api/resumes/:id/default` | Set a resume as default       |                         | `{ success }` |
| `DELETE` | `/api/resumes/:id`         | Delete a resume               |                         | `{ success }` |

## 💼 Job Seeker Job Search & Applications

| Method   | Endpoint                         | Description                             | Request Body                                                                                                           | Response                             |
| -------- | -------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `GET`    | `/api/jobs`                      | List jobs with filters                  | query: page, limit, keyword, location, jobType, experienceLevel, remote, salaryMin, salaryMax, company, industry, sort | `{ jobs, total, pagination }`        |
| `GET`    | `/api/jobs/:id`                  | Get job details (increments view count) |                                                                                                                        | `{ job, company, skills, benefits }` |
| `GET`    | `/api/jobs/recommended`          | Get personalized recommendations        | query: page, limit                                                                                                     | `[jobs with match %]`                |
| `POST`   | `/api/jobs/:id/apply`            | Apply to a job                          | `{ coverLetter, resumeUrl, fullName, email, phone, yearsOfExperience, currentLocation, agreedTerms }`                  | `{ application }`                    |
| `GET`    | `/api/applications`              | List user actions                       | query: status, page, limit                                                                                             | `[applications]`                     |
| `GET`    | `/api/applications/:id`          | Get application details                 |                                                                                                                        | `{ application, job }`               |
| `PUT`    | `/api/applications/:id/withdraw` | Withdraw application                    |                                                                                                                        | `{ success }`                        |
| `POST`   | `/api/jobs/:id/save`             | Save a job                              | `{ folderName, notes }`                                                                                                | `{ savedJob }`                       |
| `DELETE` | `/api/jobs/:id/save`             | Unsave a job                            |                                                                                                                        | `{ success }`                        |
| `GET`    | `/api/saved-jobs`                | List saved jobs                         | query: folder, page                                                                                                    | `[savedJobs]`                        |
| `PUT`    | `/api/saved-jobs/:id`            | Update saved job notes/folder           | `{ folderName, notes }`                                                                                                | updated saved job                    |
| `DELETE` | `/api/saved-jobs/:id`            | Remove saved job                        |                                                                                                                        | `{ success }`                        |
| `GET`    | `/api/jobs/history`              | Get recently viewed jobs                |                                                                                                                        | `[jobs with viewedAt]`               |
| `POST`   | `/api/jobs/:id/track-view`       | Track job view (called from frontend)   |                                                                                                                        | `{ success }`                        |

## 🏢 Company Following

| Method   | Endpoint                    | Description             | Request Body                         | Response            |
| -------- | --------------------------- | ----------------------- | ------------------------------------ | ------------------- |
| `GET`    | `/api/companies`            | List companies          | query: page, limit, industry, search | `[companies]`       |
| `GET`    | `/api/companies/:id`        | Get company profile     |                                      | `{ company, jobs }` |
| `POST`   | `/api/companies/:id/follow` | Follow a company        |                                      | `{ follow }`        |
| `DELETE` | `/api/companies/:id/follow` | Unfollow a company      |                                      | `{ success }`       |
| `GET`    | `/api/followed-companies`   | List followed companies |                                      | `[companies]`       |

## 💬 Messaging (Both Roles)

| Method | Endpoint                          | Description                               | Request Body                                     | Response                                                           |
| ------ | --------------------------------- | ----------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------ |
| `GET`  | `/api/conversations`              | List user's conversations                 |                                                  | `[ { conversation, lastMessage, unreadCount, otherParticipant } ]` |
| `GET`  | `/api/conversations/:id`          | Get conversation with messages            | query: page, limit                               | `{ conversation, messages, participants }`                         |
| `POST` | `/api/conversations`              | Start a new conversation                  | `{ recipientId, applicationId, initialMessage }` | `{ conversation, message }`                                        |
| `POST` | `/api/conversations/:id/messages` | Send a message                            | `{ content }`                                    | `{ message }`                                                      |
| `PUT`  | `/api/messages/:id/read`          | Mark message as read                      |                                                  | `{ success }`                                                      |
| `PUT`  | `/api/conversations/:id/read`     | Mark all messages in conversation as read |                                                  | `{ success }`                                                      |

## 🔔 Notifications (Both Roles)

| Method   | Endpoint                      | Description         | Request Body                     | Response                       |
| -------- | ----------------------------- | ------------------- | -------------------------------- | ------------------------------ |
| `GET`    | `/api/notifications`          | List notifications  | query: type, isRead, page, limit | `[notifications], unreadCount` |
| `PUT`    | `/api/notifications/:id/read` | Mark as read        |                                  | `{ success }`                  |
| `PUT`    | `/api/notifications/read-all` | Mark all as read    |                                  | `{ success }`                  |
| `DELETE` | `/api/notifications/:id`      | Delete notification |                                  | `{ success }`                  |

## 🏢 Employer Company Management

| Method   | Endpoint                         | Description             | Request Body                                                                                           | Response                              |
| -------- | -------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `GET`    | `/api/company`                   | Get own company profile |                                                                                                        | `{ company, settings, subscription }` |
| `PUT`    | `/api/company`                   | Update company info     | `{ name, description, website, location, mission, values, size, contactEmail, contactPhone, founded }` | updated company                       |
| `POST`   | `/api/company/logo`              | Upload logo (multipart) | logo file                                                                                              | `{ logoUrl }`                         |
| `POST`   | `/api/company/cover`             | Upload cover image      | cover file                                                                                             | `{ coverUrl }`                        |
| `GET`    | `/api/company/social-links`      | List social links       |                                                                                                        | `[socialLink]`                        |
| `POST`   | `/api/company/social-links`      | Add social link         | `{ platform, url }`                                                                                    | new socialLink                        |
| `PUT`    | `/api/company/social-links/:id`  | Update social link      | `{ platform, url }`                                                                                    | updated socialLink                    |
| `DELETE` | `/api/company/social-links/:id`  | Delete social link      |                                                                                                        | `{ success }`                         |
| `GET`    | `/api/company/benefits`          | List company benefits   |                                                                                                        | `[benefit]`                           |
| `POST`   | `/api/company/benefits`          | Add benefit             | `{ title, description, category, icon }`                                                               | new benefit                           |
| `PUT`    | `/api/company/benefits/:id`      | Update benefit          | same as above                                                                                          | updated benefit                       |
| `DELETE` | `/api/company/benefits/:id`      | Delete benefit          |                                                                                                        | `{ success }`                         |
| `GET`    | `/api/company/settings`          | Get company settings    |                                                                                                        | `{ settings }`                        |
| `PUT`    | `/api/company/settings`          | Update settings         | `{ emailNotifications, applicationAlerts, jobExpiryReminders, weeklyReports }`                         | updated settings                      |
| `GET`    | `/api/company/employees`         | List employees          |                                                                                                        | `[ { user, role } ]`                  |
| `POST`   | `/api/company/employees`         | Invite new employee     | `{ email, fullName, role }`                                                                            | `{ invitation }`                      |
| `DELETE` | `/api/company/employees/:userId` | Remove employee         |                                                                                                        | `{ success }`                         |

## 📋 Employer Job Management

| Method   | Endpoint                              | Description                    | Request Body                                                                                                                                                                                                                      | Response                                                      |
| -------- | ------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `GET`    | `/api/employer/jobs`                  | List company's jobs            | query: status, page, limit                                                                                                                                                                                                        | `{ jobs, stats }`                                             |
| `GET`    | `/api/employer/jobs/stats`            | Get job statistics (dashboard) |                                                                                                                                                                                                                                   | `{ totalJobs, activeJobs, applications, employees, +trends }` |
| `POST`   | `/api/employer/jobs`                  | Create a new job (draft)       | `{ title, discipline, description, requirements, jobType, location, experienceLevel, isRemote, salaryMin, salaryMax, currency, contactEmail, applicationDeadline, maxApplications, autoCloseApplications, benefits, industryId }` | new job                                                       |
| `GET`    | `/api/employer/jobs/:id`              | Get job details for editing    |                                                                                                                                                                                                                                   | `{ job, skills, benefits }`                                   |
| `PUT`    | `/api/employer/jobs/:id`              | Update job                     | same fields as create                                                                                                                                                                                                             | updated job                                                   |
| `PATCH`  | `/api/employer/jobs/:id/status`       | Change job status              | `{ status } (DRAFT, ACTIVE, CLOSED)`                                                                                                                                                                                              | updated job                                                   |
| `DELETE` | `/api/employer/jobs/:id`              | Delete job (soft)              |                                                                                                                                                                                                                                   | `{ success }`                                                 |
| `POST`   | `/api/employer/jobs/:id/skills`       | Add skill requirement          | `{ skillName, experienceYears, isRequired, priority }`                                                                                                                                                                            | new jobSkill                                                  |
| `PUT`    | `/api/employer/jobs/skills/:skillId`  | Update job skill               | same fields                                                                                                                                                                                                                       | updated jobSkill                                              |
| `DELETE` | `/api/employer/jobs/skills/:skillId`  | Remove skill                   |                                                                                                                                                                                                                                   | `{ success }`                                                 |
| `POST`   | `/api/employer/jobs/:id/benefits`     | Add benefit to job             | `{ benefitId }` or create new?                                                                                                                                                                                                    | job benefit                                                   |
| `DELETE` | `/api/employer/jobs/:id/benefits/:id` | Remove benefit from job        |                                                                                                                                                                                                                                   | `{ success }`                                                 |
| `POST`   | `/api/employer/jobs/:id/clone`        | Clone a job (creates draft)    |                                                                                                                                                                                                                                   | new job                                                       |

## 📬 Employer Applications Management

| Method | Endpoint                                 | Description                           | Request Body                                                        | Response                                            |
| ------ | ---------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| `GET`  | `/api/employer/applications`             | List all applications to company jobs | query: jobId, status, page, limit, search                           | `[applications], stats`                             |
| `GET`  | `/api/employer/applications/stats`       | Application statistics                |                                                                     | `{ total, pending, inReview, rejected, thisMonth }` |
| `GET`  | `/api/employer/applications/:id`         | Get application details               |                                                                     | `{ application, applicant, job, messages }`         |
| `PUT`  | `/api/employer/applications/:id/status`  | Update application status             | `{ status, rejectionReason, interviewScheduledAt, interviewNotes }` | updated application                                 |
| `POST` | `/api/employer/applications/:id/message` | Send message to applicant             | `{ content }`                                                       | `{ message }`                                       |
| `POST` | `/api/employer/applications/:id/notes`   | Add private notes                     | `{ notes }`                                                         | `{ success }`                                       |

## ⭐ Employer Saved Candidates

| Method   | Endpoint                             | Description                   | Request Body                                                                     | Response                                                     |
| -------- | ------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `GET`    | `/api/employer/saved-candidates`     | List saved candidates         | query: folder, page, limit, search, availability                                 | `[ { candidate, savedAt, notes, folder } ]`                  |
| `POST`   | `/api/employer/saved-candidates`     | Save a candidate              | `{ candidateId, folderName, notes }`                                             | new savedCandidate                                           |
| `PUT`    | `/api/employer/saved-candidates/:id` | Update saved candidate        | `{ folderName, notes }`                                                          | updated savedCandidate                                       |
| `DELETE` | `/api/employer/saved-candidates/:id` | Remove saved candidate        |                                                                                  | `{ success }`                                                |
| `GET`    | `/api/employer/candidates/search`    | Search/browse candidates      | query: keyword, skills, location, experience, availability, salaryMin, salaryMax | `[candidates]`                                               |
| `GET`    | `/api/employer/candidates/:userId`   | View candidate public profile |                                                                                  | `{ profile, skills, education, experience, certifications }` |

## 💰 Employer Billing & Subscription

| Method | Endpoint                       | Description              | Request Body                | Response                        |
| ------ | ------------------------------ | ------------------------ | --------------------------- | ------------------------------- |
| `GET`  | `/api/plans`                   | List available plans     |                             | `[plan]`                        |
| `GET`  | `/api/subscription`            | Get current subscription |                             | `{ subscription, plan, usage }` |
| `POST` | `/api/subscription`            | Subscribe to a plan      | `{ planId, paymentMethod }` | new subscription                |
| `PUT`  | `/api/subscription/cancel`     | Cancel subscription      | `{ cancelAtPeriodEnd }`     | updated subscription            |
| `PUT`  | `/api/subscription/reactivate` | Reactivate canceled sub  |                             | updated subscription            |
| `GET`  | `/api/invoices`                | List company invoices    | query: page, limit          | `[invoice]`                     |
| `GET`  | `/api/invoices/:id`            | Get invoice details      |                             | `{ invoice, pdfUrl }`           |

## 📊 Employer Dashboard & Analytics

| Method | Endpoint                  | Description            | Request Body                              | Response                                                                    |
| ------ | ------------------------- | ---------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| `GET`  | `/api/employer/dashboard` | Get dashboard overview |                                           | `{ stats, recentJobs, recentApplications, recentEmployees, notifications }` |
| `GET`  | `/api/employer/analytics` | Get detailed analytics | query: from, to, groupBy (day/week/month) | `{ applicationsOverTime, jobViews, applicantSources, etc. }`                |

## 🌐 Public / Utility

| Method | Endpoint          | Description                          | Request Body | Response       |
| ------ | ----------------- | ------------------------------------ | ------------ | -------------- |
| `GET`  | `/api/industries` | List industries (with subcategories) |              | `[industries]` |
| `GET`  | `/api/skills`     | Search skills (autocomplete)         |              | `[skills]`     |
| `GET`  | `/api/locations`  | Autocomplete locations               |              | `[locations]`  |
| `GET`  | `/api/health`     | Health check                         |              | `OK`           |
