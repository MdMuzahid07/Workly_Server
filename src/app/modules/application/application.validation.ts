import { z } from "zod";

const PreferredContactMethodEnum = z.enum(["email", "phone", "both"]);

const createApplication = z.object({
  jobId: z.string().min(1, { message: "Job ID is required" }),
  fullName: z.string().min(2, "Full name must be at least 2 characters").optional(),
  email: z.string().email("Please enter a valid email").optional(),
  phone: z.string().min(10, "Please enter a valid phone number").optional(),
  location: z.string().optional(),
  currentRole: z.string().optional(),
  experience: z.string().optional(),
  portfolio: z.string().optional(),
  coverLetter: z.string().optional(),
  resumeFile: z.string().optional(),
  agreeTerms: z.boolean().optional(),
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
