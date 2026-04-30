import { z } from "zod";

const toggleSaveCandidate = z.object({
  candidateId: z.string({
    message: "Candidate ID is required",
  }),
});

const candidateValidation = {
  toggleSaveCandidate,
};

export default candidateValidation;
