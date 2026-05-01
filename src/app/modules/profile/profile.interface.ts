import type { JobType } from "../../../generated/prisma/index.js";

export type IEducation = {
  id?: string;
  institution: string;
  institute?: string; // from frontend
  degree: string;
  fieldOfStudy?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  grade?: string;
  result?: string; // from frontend
  description?: string;
  year?: string; // from frontend
  level?: string; // from frontend
};

export type IWorkExperience = {
  id?: string;
  jobTitle: string;
  designation?: string; // from frontend
  company: string;
  location?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  description?: string;
  current?: boolean;
  currentlyWorking?: boolean; // from frontend
  employmentType?: string; // from frontend
};

export type ICertification = {
  id?: string;
  name: string;
  issuingOrg: string;
  issueDate?: string | Date;
  expiryDate?: string | Date;
  credentialId?: string;
  credentialUrl?: string;
};

export type IProject = {
  id?: string;
  title: string;
  description?: string;
  link?: string;
  technologies?: string[];
  startDate?: string | Date;
  endDate?: string | Date;
  current?: boolean;
};

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

export type IAddress = {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
};

export type IVolunteer = {
  id?: string;
  role: string;
  organization: string;
  cause?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  current?: boolean;
  currentlyVolunteering?: boolean; // from frontend
  description?: string;
};

export type IAward = {
  id?: string;
  title: string;
  issuer: string;
  issueDate?: string | Date;
  date?: string | Date; // from frontend
  description?: string;
};

export type IPublication = {
  id?: string;
  title: string;
  publisher: string;
  publishDate?: string | Date;
  date?: string | Date; // from frontend
  link?: string;
  description?: string;
};

export type IReference = {
  id?: string;
  name: string;
  relationship: string;
  company?: string;
  email?: string;
  phone?: string;
};

export type ILanguage = {
  id?: string;
  language: string;
  proficiency: string;
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
  githubUrl?: string;
  headline?: string;
  totalExperienceYears?: number;
  skills?: ISkill[];
  preference?: IPreference;
  education?: IEducation[];
  workExperiences?: IWorkExperience[];
  certifications?: ICertification[];
  projects?: IProject[];
  volunteers?: IVolunteer[];
  awards?: IAward[];
  publications?: IPublication[];
  references?: IReference[];
  languages?: ILanguage[];
  address?: IAddress;
};
