import { z } from "zod";

const JobTypeEnum = z.enum([
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "FREELANCE",
  "REMOTE",
]);

const JobSkillPriorityEnum = z.enum(["HIGH", "MEDIUM", "LOW", "GOOD_TO_HAVE"]);

const jobSkillSchema = z.object({
  skillName: z.string().min(1, { message: "Skill name is required" }),
  experienceYears: z.number().min(0, { message: "Experience years cannot be negative" }),
  isRequired: z.boolean().default(true),
  priority: JobSkillPriorityEnum.default("HIGH"),
  description: z.string().optional(),
});

export const createJob = z.object({
  title: z.string().min(1, { message: "Job title is required" }),
  discipline: z.string().min(1, { message: "Discipline is required" }),
  requirements: z.array(z.string()).min(1, { message: "At least one requirement is required" }),
  jobType: JobTypeEnum,
  location: z.string().min(1, { message: "Location is required" }),
  experienceLevel: z.string().min(1, { message: "Experience level is required" }),
  industryId: z.string().min(1, { message: "Industry is required" }),
  isRemote: z.boolean().default(false),
  salaryMin: z.number().nonnegative({ message: "Minimum salary cannot be negative" }).optional(),
  salaryMax: z.number().nonnegative({ message: "Maximum salary cannot be negative" }).optional(),
  currency: z
    .string()
    .length(3, { message: "Currency must be a 3-letter code (e.g., USD)" })
    .optional(),
  contactEmail: z.string().optional(),
  applicationDeadline: z.string().optional(),
  maxApplications: z
    .number()
    .int({ message: "Max applications must be an integer" })
    .nonnegative({ message: "Max applications cannot be negative" })
    .optional(),
  autoCloseApplications: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  expiresAt: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  companyId: z.string(),

  skillsRequired: z.array(jobSkillSchema).optional(),
});

const updateJob = createJob.partial();

const jobValidation = {
  createJob,
  updateJob,
};

export default jobValidation;
