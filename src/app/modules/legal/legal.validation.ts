import { z } from "zod";

const upsertLegalDocumentZodSchema = z.object({
  title: z.string({
    message: "Title is required",
  }),
  intro: z.string({
    message: "Intro is required",
  }),
  content: z.string({
    message: "Content is required",
  }),
  lastUpdated: z.string({
    message: "Last updated date is required",
  }),
});

const legalValidation = {
  upsertLegalDocumentZodSchema,
};

export default legalValidation;
