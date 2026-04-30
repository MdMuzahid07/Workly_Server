import { z } from "zod";

const followCompany = z.object({
  companyId: z.string().uuid(),
});

const unfollowCompany = z.object({
  companyId: z.string().uuid(),
});

export const followValidation = {
  followCompany,
  unfollowCompany,
};
