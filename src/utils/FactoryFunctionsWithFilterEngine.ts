// import { FilterEngine } from "./FilterEngine.js";

// const createCompanyFilter = (prisma: any) => {
//   return new FilterEngine(prisma.company, "companies", [
//     "name",
//     "description",
//     "industry",
//     "location",
//     "size",
//     "isVerified",
//     "createdAt",
//     "updatedAt",
//   ]);
// };

// const createJobFilter = (prisma: any) => {
//   return new FilterEngine(prisma.job, "jobs", [
//     "title",
//     "discipline",
//     "requirements",
//     "jobType",
//     "experienceLevel",
//     "salaryMin",
//     "salaryMax",
//     "location",
//     "isRemote",
//     "companyId",
//     "isActive",
//     "createdAt",
//   ]);
// };

// const createUserFilter = (prisma: any) => {
//   return new FilterEngine(prisma.user, "users", [
//     "fullName",
//     "email",
//     "role",
//     "isVerified",
//     "isActive",
//     "lastLogin",
//     "companyId",
//     "createdAt",
//   ]);
// };

// const createApplicationFilter = (prisma: any) => {
//   return new FilterEngine(prisma.application, "applications", [
//     "status",
//     "applicantId",
//     "jobId",
//     "createdAt",
//     "statusChangedAt",
//     "interviewScheduledAt",
//     "withdrawnAt",
//   ]);
// };

// const factoryFunctions = {
//   createCompanyFilter,
//   createJobFilter,
//   createUserFilter,
//   createApplicationFilter,
// };

// export default factoryFunctions;

import { FilterEngine } from "./FilterEngine.js";

/**
 * Factory Functions for Creating Filter Engines
 *
 * These functions create pre-configured FilterEngine instances for each model.
 * The allowed fields list determines which fields can be used for filtering,
 * sorting, and searching - providing security and preventing unauthorized data access.
 */

/**
 * Company Filter Engine
 * Allowed operations: search, filter, sort by company fields
 */
const createCompanyFilter = (prisma: any) => {
  return new FilterEngine(prisma.company, "companies", [
    // ========== Searchable fields ==========
    "name",
    "slug",
    "description",
    "industry",
    "location",
    "size",
    "contactEmail",
    "contactPhone",

    // ========== Filterable fields ==========
    "isVerified",
    "verifiedAt",

    // ========== Sortable fields ==========
    "createdAt",
    "updatedAt",
  ]);
};

/**
 * Job Filter Engine
 * Allowed operations: search, filter, sort by job fields
 *
 * Supports your UI filters:
 * - Location (whereIn)
 * - Job Type (whereIn)
 * - Experience Level (whereIn)
 * - Salary Range (range)
 * - Remote (where)
 * - Featured (where)
 * - Posted Within (dateRange on createdAt)
 */
const createJobFilter = (prisma: any) => {
  return new FilterEngine(prisma.job, "jobs", [
    // ========== Searchable fields ==========
    "title",
    "slug",
    "discipline",
    "requirements",

    // ========== Multi-select filters (whereIn) ==========
    "jobType", // FULL_TIME, PART_TIME, CONTRACT, etc.
    "experienceLevel", // Entry Level, Intermediate, Expert
    "location", // Remote, New York, NY, etc.

    // ========== Range filters ==========
    "salaryMin",
    "salaryMax",
    "viewCount",
    "applyCount",

    // ========== Boolean/Exact match filters ==========
    "isRemote",
    "isActive",
    "isFeatured",
    "companyId",
    "postedById",

    // ========== Additional fields ==========
    "currency",
    "contactEmail",

    // ========== Date fields (for dateRange) ==========
    "applicationDeadline",
    "expiresAt",
    "createdAt",
    "updatedAt",
  ]);
};

/**
 * User Filter Engine
 * Allowed operations: search, filter, sort by user fields
 */
const createUserFilter = (prisma: any) => {
  return new FilterEngine(prisma.user, "users", [
    // ========== Searchable fields ==========
    "fullName",
    "email",
    "phone",

    // ========== Filterable fields ==========
    "role", // JOB_SEEKER, EMPLOYER, ADMIN, SUPER_ADMIN
    "isVerified",
    "isActive",
    "profileVisibility", // PUBLIC, PRIVATE
    "companyId",
    "profileId",

    // ========== Date fields ==========
    "lastLogin",
    "createdAt",
    "updatedAt",
  ]);
};

/**
 * Application Filter Engine
 * Allowed operations: search, filter, sort by application fields
 */
const createApplicationFilter = (prisma: any) => {
  return new FilterEngine(prisma.application, "applications", [
    // ========== Filterable fields ==========
    "status", // SUBMITTED, REVIEWING, SHORTLISTED, etc.
    "applicantId",
    "jobId",
    "preferredContactMethod", // email, phone, both
    "folderName",
    "statusChangedBy",

    // ========== Date fields ==========
    "createdAt",
    "updatedAt",
    "statusChangedAt",
    "interviewScheduledAt",
    "withdrawnAt",
  ]);
};

/**
 * Saved Job Filter Engine
 * Allowed operations: filter saved jobs by user, job, folder
 */
const createSavedJobFilter = (prisma: any) => {
  return new FilterEngine(prisma.savedJob, "saved_jobs", [
    "userId",
    "jobId",
    "folderName",
    "createdAt",
  ]);
};

/**
 * Notification Filter Engine
 * Allowed operations: filter notifications by type, read status, user
 */
const createNotificationFilter = (prisma: any) => {
  return new FilterEngine(prisma.notification, "notifications", [
    "type", // APPLICATION_RECEIVED, NEW_JOB_MATCH, etc.
    "title",
    "userId",
    "jobId",
    "applicationId",
    "isRead",
    "createdAt",
  ]);
};

/**
 * Job Skill Filter Engine (Optional - for advanced skill filtering)
 * Allowed operations: filter job skills by name, experience, priority
 */
const createJobSkillFilter = (prisma: any) => {
  return new FilterEngine(prisma.jobSkill, "job_skills", [
    "skillName",
    "experienceYears",
    "isRequired",
    "priority", // HIGH, MEDIUM, LOW, GOOD_TO_HAVE
    "jobId",
    "createdAt",
    "updatedAt",
  ]);
};

/**
 * Audit Log Filter Engine
 * Allowed operations: filter audit logs for admin/monitoring
 */
const createAuditLogFilter = (prisma: any) => {
  return new FilterEngine(prisma.auditLog, "audit_logs", [
    "entityType",
    "entityId",
    "action",
    "userId",
    "ipAddress",
    "createdAt",
  ]);
};

/**
 * Benefits Filter Engine
 * Allowed operations: filter benefits by category, company, job
 */
const createBenefitsFilter = (prisma: any) => {
  return new FilterEngine(prisma.benefits, "benefits", [
    "title",
    "category",
    "icon",
    "isActive",
    "companyId",
    "jobId",
    "createdAt",
    "updatedAt",
  ]);
};

// ========== Export all factory functions ==========
const factoryFunctions = {
  // ========== Core entities ==========
  createCompanyFilter,
  createJobFilter,
  createUserFilter,
  createApplicationFilter,

  // ========== Additional entities ==========
  createSavedJobFilter,
  createNotificationFilter,
  createJobSkillFilter,
  createAuditLogFilter,
  createBenefitsFilter,
};

export default factoryFunctions;
