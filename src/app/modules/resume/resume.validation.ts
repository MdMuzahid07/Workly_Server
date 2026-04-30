import { z } from "zod";

// For upload, only isDefault is validated in body (file is handled by multer)
const uploadResume = z.object({
  isDefault: z.boolean().optional(),
});

// For setDefault and delete, no body validation needed, but you can add param validation if your middleware supports it
const setDefaultResume = z.object({});
const deleteResume = z.object({});

export default {
  uploadResume,
  setDefaultResume,
  deleteResume,
};
