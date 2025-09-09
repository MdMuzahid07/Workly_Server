import { z } from "zod";

const PreferredContactMethodEnum = z.enum(["email", "phone", "both"]);

const createApplication = z.object({
  jobId: z.string().min(1, { message: "Job ID is required" }),
  coverLetter: z.string().optional(),
  preferredContactMethod: PreferredContactMethodEnum.default("email"),
  applicationData: z.string().optional(),
  folderName: z.string().optional(),
});

const getMyApplications = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.string().optional(),
});

const getJobApplications = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.string().optional(),
  q: z.string().optional(),
});

const updateStatus = z.object({
  status: z.enum(["REVIEWING", "SHORTLISTED", "INTERVIEWED", "REJECTED", "OFFERED", "ACCEPTED"]),
  rejectionReason: z.string().optional(),
});

const withdraw = z.object({});
const scheduleInterview = z.object({
  interviewScheduledAt: z.string().min(1),
  interviewNotes: z.string().optional(),
});

const updateNotes = z.object({
  interviewNotes: z.string().min(1),
});

const applicationValidation = {
  createApplication,
  getMyApplications,
  getJobApplications,
  updateStatus,
  withdraw,
  scheduleInterview,
  updateNotes,
};

export default applicationValidation;
