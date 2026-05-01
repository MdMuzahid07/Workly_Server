import z from "zod";

const skillSchema = z.object({
  id: z.string().optional(),
  skillName: z.string().optional(),
  skill: z.string().optional(),
  experienceYears: z
    .number()
    .min(0, { message: "Experience cannot be negative" })
    .max(50, { message: "Experience cannot exceed 35 years" })
    .optional()
    .nullable(),
  type: z.string().optional(),
});

const preferenceSchema = z.object({
  jobType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE", "REMOTE"], {
    message:
      "Job type must be one of: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, FREELANCE,REMOTE",
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

const educationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().optional(),
  institute: z.string().optional(),
  degree: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  level: z.string().optional(),
  year: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  grade: z.string().optional(),
  result: z.string().optional(),
  description: z.string().optional().nullable(),
});

const workExperienceSchema = z.object({
  id: z.string().optional(),
  jobTitle: z.string().optional(),
  designation: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional().nullable(),
  employmentType: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  current: z.boolean().optional(),
  currentlyWorking: z.boolean().optional(),
});

const projectSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  technologies: z.array(z.string()).optional(),
  projectUrl: z.string().optional().nullable(),
  repoUrl: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

const volunteerSchema = z.object({
  id: z.string().optional(),
  role: z.string().optional(),
  organization: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  current: z.boolean().optional(),
  currentlyVolunteering: z.boolean().optional(),
});

const awardSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  issuer: z.string().optional(),
  issueDate: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const publicationSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  publisher: z.string().optional(),
  publishDate: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const referenceSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  relationship: z.string().optional(),
  company: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

const languageSchema = z.object({
  id: z.string().optional(),
  language: z.string().optional(),
  proficiency: z.string().optional(),
});

const addressSchema = z.object({
  street: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zipCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

const createProfile = z.object({
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
