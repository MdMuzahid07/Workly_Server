// import type { Job, JobType, User } from "../../../generated/prisma/index.js";

// export interface Profile {
//   id: string;
//   userId: string;
//   bio?: string | null;
//   location?: string | null;
//   avatarUrl?: string | null;
//   coverUrl?: string | null;
//   resumeUrl?: string | null;
//   linkedInUrl?: string | null;
//   websiteUrl?: string | null;

//   skills?: Skill[];
//   preferences?: Preference[];
//   user?: User | null;
// }

// // Skill schema
// export interface Skill {
//   id: string;
//   skillName: string;
//   experienceYears: number;

//   profileId: string;
//   profile: Profile;

//   jobId?: string | null;
//   job?: Job | null;
// }

// // Preference schema
// export interface Preference {
//   id: string;
//   profileId: string;
//   profile: Profile;

//   jobType: JobType;
//   expectedSalary?: number | null;
//   preferredLocation?: string | null;
//   remoteWork: boolean;
//   industry?: string | null;
//   workExperience?: string | null;
//   createdAt: Date;
//   updatedAt: Date;
// }
