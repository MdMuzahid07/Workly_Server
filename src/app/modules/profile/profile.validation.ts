import { z } from "zod";

const skillSchema = z.object({
  skillName: z
    .string()
    .min(1, { message: "Skill name is required" })
    .max(100, { message: "Skill name cannot exceed 100 characters" }),
  experienceYears: z
    .number({
      message: "Experience years must be a number",
    })
    .min(0, { message: "Experience cannot be negative" })
    .max(50, { message: "Experience cannot exceed 35 years" }),
});

const preferenceSchema = z.object({
  jobType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"], {
    message: "Job type must be one of: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE",
  }),
  expectedSalary: z
    .number({
      message: "Expected salary must be a number",
    })
    .int({ message: "Salary must be a whole number" })
    .min(0, { message: "Salary cannot be negative" })
    .optional()
    .nullable(),
  preferredLocation: z
    .string()
    .min(1, { message: "Preferred location is required" })
    .max(255, { message: "Preferred location cannot exceed 255 characters" })
    .optional()
    .nullable(),
  remoteWork: z
    .boolean({
      message: "Remote work must be true or false",
    })
    .default(false),
  industry: z
    .string()
    .min(1, { message: "Industry is required" })
    .max(100, { message: "Industry cannot exceed 100 characters" })
    .optional()
    .nullable(),
  workExperience: z
    .string()
    .min(1, { message: "Work experience description is required" })
    .max(100, { message: "Work experience cannot exceed 100 characters" })
    .optional()
    .nullable(),
});

const createProfile = z.object({
  bio: z.string().optional().nullable(),
  location: z
    .string()
    .max(255, { message: "Location cannot exceed 255 characters" })
    .optional()
    .nullable(),
  avatarUrl: z
    .string({ message: "Invalid avatar URL" })
    .max(500, { message: "Avatar URL cannot exceed 500 characters" })
    .optional()
    .nullable(),
  coverUrl: z
    .string({ message: "Invalid cover URL" })
    .max(500, { message: "Cover URL cannot exceed 500 characters" })
    .optional()
    .nullable(),
  resumeUrl: z
    .string({ message: "Invalid resume URL" })
    .max(500, { message: "Resume URL cannot exceed 500 characters" })
    .optional()
    .nullable(),
  linkedInUrl: z
    .string({ message: "Invalid LinkedIn URL" })
    .max(500, { message: "LinkedIn URL cannot exceed 500 characters" })
    .optional()
    .nullable(),
  websiteUrl: z
    .string({ message: "Invalid website URL" })
    .max(500, { message: "Website URL cannot exceed 500 characters" })
    .optional()
    .nullable(),
  skills: z.array(skillSchema).min(1, { message: "At least one skill is required" }),
  preference: preferenceSchema.optional().nullable(),
});

const updateProfile = createProfile
  .partial()
  .extend({
    skills: z.array(skillSchema).min(1, { message: "At least one skill is required" }).optional(),
    preference: preferenceSchema.optional().nullable(),
  })
  .refine(
    (data) => {
      return Object.keys(data).length > 0;
    },
    { message: "At least one field must be provided for update" },
  );

const profileValidation = {
  createProfile,
  updateProfile,
};

export default profileValidation;
