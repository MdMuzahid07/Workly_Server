import { z } from "zod";

// Define the schema for education data
export const educationSchema = z.object({
  degree: z.string().min(1, "Degree is required"),
  institution: z.string().min(1, "Institution is required"),
  fieldOfStudy: z.string().min(1, "Field of study is required"),
  startDate: z.string().min(1, "Start date is required"), // ISO string or date string
  endDate: z.string().optional(), // Optional for ongoing education
  grade: z.string().optional(),
  description: z.string().optional(),
});

// For addEducation, require all main fields
const addEducation = educationSchema;

// For updateEducation, allow partial updates
const updateEducation = educationSchema.partial();

// For deleteEducation, no body validation needed
const deleteEducation = z.object({});

export default {
  addEducation,
  updateEducation,
  deleteEducation,
};
