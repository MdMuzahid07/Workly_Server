import { z } from "zod";

const PreferredContactMethodEnum = z.enum(["email", "phone", "both"]);

export const createApplication = z.object({
  jobId: z.string().min(1, { message: "Job ID is required" }),
  coverLetter: z.string().optional(),
  preferredContactMethod: PreferredContactMethodEnum.default("email"),
  applicationData: z.string().optional(),
  folderName: z.string().optional(),
});

const applicationValidation = {
  createApplication,
};

export default applicationValidation;
