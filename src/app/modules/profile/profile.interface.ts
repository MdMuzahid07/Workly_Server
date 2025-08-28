import type { JobType } from "../../../generated/prisma/index.js";

export type ISkill = {
  skillName: string;
  experienceYears: number;
  id: string;
};

export type IPreference = {
  jobType?: JobType;
  expectedSalary?: number;
  preferredLocation?: string;
  remoteWork?: boolean;
  industry?: string;
  workExperience?: string;
};

export type IProfile = {
  userId: string;
  bio?: string;
  location?: string;
  avatarUrl?: string;
  coverUrl?: string;
  resumeUrl?: string;
  linkedInUrl?: string;
  websiteUrl?: string;
  skills?: ISkill[];
  preference?: IPreference;
};
