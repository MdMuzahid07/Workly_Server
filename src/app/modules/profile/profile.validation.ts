import z from "zod";

const dateLikeSchema = z.union([z.string(), z.date()]).optional().nullable();
const numberLikeSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === "") return undefined;
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  });

const skillSchema = z.object({
  id: z.string().optional().nullable(),
  skillName: z.string().optional().nullable(),
  skill: z.string().optional().nullable(),
  experienceYears: numberLikeSchema
    .pipe(
      z
        .number()
        .min(0, { message: "Experience cannot be negative" })
        .max(50, { message: "Experience cannot exceed 35 years" }),
    )
    .optional()
    .nullable(),
  type: z.string().optional().nullable(),
});
const preferenceSchema = z.object({
  id: z.string().optional().nullable(),
  profileId: z.string().optional().nullable(),
  jobType: z
    .enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE", "REMOTE"], {
      message:
        "Job type must be one of: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE, REMOTE",
    })
    .optional()
    .nullable(),
  expectedSalary: numberLikeSchema
    .pipe(
      z.number({
        message: "Expected salary must be a number",
      }),
    )
    .pipe(
      z
        .number()
        .int({ message: "Salary must be a whole number" })
        .min(0, { message: "Salary cannot be negative" }),
    )
    .optional()
    .nullable(),
  preferredLocation: z.string().max(255).optional().nullable(),
  remoteWork: z.boolean().optional().default(false),
  industry: z.string().max(100).optional().nullable(),
  workExperience: z.string().max(100).optional().nullable(),
});
const educationSchema = z.object({
  id: z.string().optional().nullable(),
  institution: z.string().optional().nullable(),
  institute: z.string().optional().nullable(),
  degree: z.string().optional().nullable(),
  fieldOfStudy: z.string().optional().nullable(),
  level: z.string().optional().nullable(),
  year: z.string().optional().nullable(),
  startDate: dateLikeSchema,
  endDate: dateLikeSchema,
  grade: z.string().optional().nullable(),
  result: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});
const certificationSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  issuingOrg: z.string().optional().nullable(),
  organization: z.string().optional().nullable(),
  issueDate: dateLikeSchema,
  expiryDate: dateLikeSchema,
  expirationDate: dateLikeSchema,
  credentialId: z.string().optional().nullable(),
  credentialUrl: z.string().optional().nullable(),
  file: z.any().optional().nullable(),
});
const workExperienceSchema = z.object({
  id: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  employmentType: z.string().optional().nullable(),
  startDate: dateLikeSchema,
  endDate: dateLikeSchema,
  description: z.string().optional().nullable(),
  current: z.boolean().optional().nullable(),
  currentlyWorking: z.boolean().optional().nullable(),
});
const projectSchema = z.object({
  id: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  technologies: z.array(z.string()).optional().nullable(),
  projectUrl: z.string().optional().nullable(),
  repoUrl: z.string().optional().nullable(),
  startDate: dateLikeSchema,
  endDate: dateLikeSchema,
});
const volunteerSchema = z.object({
  id: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  organization: z.string().optional().nullable(),
  startDate: dateLikeSchema,
  endDate: dateLikeSchema,
  description: z.string().optional().nullable(),
  current: z.boolean().optional().nullable(),
  currentlyVolunteering: z.boolean().optional().nullable(),
});
const awardSchema = z.object({
  id: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  issuer: z.string().optional().nullable(),
  issueDate: dateLikeSchema,
  date: dateLikeSchema,
  description: z.string().optional().nullable(),
});
const publicationSchema = z.object({
  id: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  publisher: z.string().optional().nullable(),
  publishDate: dateLikeSchema,
  date: dateLikeSchema,
  url: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});
const referenceSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().optional().nullable(),
  relationship: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});
const languageSchema = z.object({
  id: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  proficiency: z.string().optional().nullable(),
});
const addressSchema = z.object({
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});
const createProfile = z.object({
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
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
  profilePicture: z
    .string({ message: "Invalid profile picture URL" })
    .max(500, { message: "Profile picture URL cannot exceed 500 characters" })
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
  githubUrl: z.string().optional().nullable(),
  skills: z.array(skillSchema).optional(),
  preference: preferenceSchema.optional().nullable(),
  education: z.array(educationSchema).optional(),
  workExperiences: z.array(workExperienceSchema).optional(),
  projects: z.array(projectSchema).optional(),
  certifications: z.array(certificationSchema).optional(),
  volunteers: z.array(volunteerSchema).optional(),
  awards: z.array(awardSchema).optional(),
  publications: z.array(publicationSchema).optional(),
  references: z.array(referenceSchema).optional(),
  languages: z.array(languageSchema).optional(),
  address: addressSchema.optional().nullable(),
});
const updateProfile = createProfile.partial().refine(
  (data) => {
    return Object.keys(data).length > 0;
  },
  { message: "At least one field must be provided for update" },
);

const saveJob = z.object({
  jobId: z.string().min(1, { message: "Job ID is required" }),
});

const updateSavedJob = z
  .object({
    folderName: z
      .string()
      .max(100, { message: "Folder name cannot exceed 100 characters" })
      .optional(),
    notes: z.string().max(1000, { message: "Notes cannot exceed 1000 characters" }).optional(),
  })
  .refine(
    (data) => {
      return data.folderName !== undefined || data.notes !== undefined;
    },
    { message: "At least one field (folderName or notes) must be provided" },
  );

const profileValidation = {
  createProfile,
  updateProfile,
  saveJob,
  updateSavedJob,
};

export default profileValidation;
