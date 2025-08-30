import { z } from "zod";

const ApplicationStatusEnum = z.enum([
  "SUBMITTED",
  "REVIEWING",
  "SHORTLISTED",
  "INTERVIEWED",
  "REJECTED",
  "OFFERED",
  "ACCEPTED",
  "WITHDRAWN",
]);

const PreferredContactMethodEnum = z.enum(["email", "phone", "both"]);

export const createApplication = z.object({
  jobId: z.string().min(1, { message: "Job ID is required" }),
  coverLetter: z.string().optional(),
  preferredContactMethod: PreferredContactMethodEnum.default("email"),
  applicantData: z.any().optional(),
  folderName: z.string().optional(),
});

export const updateApplication = z.object({
  status: ApplicationStatusEnum.optional(),
  coverLetter: z.string().optional(),
  preferredContactMethod: PreferredContactMethodEnum.optional(),
  rejectionReason: z.string().optional(),
  interviewScheduledAt: z.string().optional(),
  interviewNotes: z.string().optional(),
  folderName: z.string().optional(),
});

export const getApplications = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: ApplicationStatusEnum.optional(),
  jobId: z.string().optional(),
  applicantId: z.string().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "status"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const applicationValidation = {
  createApplication,
  updateApplication,
  getApplications,
};

export default applicationValidation;
