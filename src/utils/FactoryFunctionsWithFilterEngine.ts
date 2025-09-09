import { FilterEngine } from "./FilterEngine.js";

const createCompanyFilter = (prisma: any) => {
  return new FilterEngine(prisma.company, "companies", [
    "name",
    "description",
    "industry",
    "location",
    "size",
    "isVerified",
    "createdAt",
    "updatedAt",
  ]);
};

const createJobFilter = (prisma: any) => {
  return new FilterEngine(prisma.job, "jobs", [
    "title",
    "description",
    "discipline",
    "requirements",
    "jobType",
    "experienceLevel",
    "salary",
    "location",
    "isRemote",
    "companyId",
    "isActive",
    "createdAt",
  ]);
};

const createUserFilter = (prisma: any) => {
  return new FilterEngine(prisma.user, "users", [
    "fullName",
    "email",
    "role",
    "isVerified",
    "isActive",
    "lastLogin",
    "companyId",
    "createdAt",
  ]);
};

const createApplicationFilter = (prisma: any) => {
  return new FilterEngine(prisma.application, "applications", [
    "status",
    "applicantId",
    "jobId",
    "createdAt",
    "statusChangedAt",
    "interviewScheduledAt",
    "withdrawnAt",
  ]);
};

const factoryFunctions = {
  createCompanyFilter,
  createJobFilter,
  createUserFilter,
  createApplicationFilter,
};

export default factoryFunctions;
