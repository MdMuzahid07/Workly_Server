import httpStatus from "http-status";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";
import type { IProfile, ISkill } from "./profile.interface.js";

const createProfile = async (userId: string, payload: IProfile) => {
  const isUserExits = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found to create profile`);
  }

  if (isUserExits && !isUserExits?.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not verified`);
  }

  const isProfileExists = await prisma.profile.findUnique({
    where: {
      userId: userId,
    },
  });

  if (isProfileExists) {
    throw new AppError(httpStatus.BAD_REQUEST, `User already has a profile`);
  }

  const result = await prisma.$transaction(async (transactor) => {
    const userProfile = await transactor.profile.create({
      data: {
        userId: userId,
        bio: payload.bio || "",
        location: payload.location || "",
        avatarUrl: payload.avatarUrl || "",
        coverUrl: payload.coverUrl || "",
        resumeUrl: payload.resumeUrl || "",
        linkedInUrl: payload.linkedInUrl || "",
        websiteUrl: payload.websiteUrl || "",
        githubUrl: payload.githubUrl || "",
      },
    });

    await transactor.user.update({
      where: {
        id: userId,
      },
      data: {
        profileId: userProfile.id,
      },
    });

    if (payload.skills?.length) {
      await transactor.skill.createMany({
        data: payload.skills?.map((skill: ISkill) => ({
          skillName: skill.skillName,
          profileId: userProfile.id,
          experienceYears: skill.experienceYears,
        })),
      });
    }

    if (payload.preference) {
      await transactor.preference.create({
        data: {
          profileId: userProfile.id,
          jobType: payload.preference.jobType || "FULL_TIME",
          expectedSalary: payload.preference.expectedSalary || 0,
          preferredLocation: payload.preference.preferredLocation || "",
          remoteWork: payload.preference.remoteWork || false,
          industry: payload.preference.industry || "",
          workExperience: payload.preference.workExperience || "",
        },
      });
    }

    return userProfile;
  });

  return result;
};

const myProfile = async (userId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const result = await prisma.user.findUnique({
    where: {
      id: userId,
      isActive: true,
      deletedAt: null,
      isVerified: true,
    },
    include: {
      profile: {
        include: {
          skills: true,
          preference: true,
          education: true,
          workExperiences: true,
          certifications: true,
          projects: true,
          volunteers: true,
          awards: true,
          publications: true,
          references: true,
          languages: true,
          address: true,
        },
      },
      company: true,
      jobsPosted: true,
      applications: true,
      savedJobs: true,
      resumes: true,
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Profile not found");
  }

  const { passwordHash, ...rest } = result;

  return rest;
};

const updateMyProfile = async (userId: string, payload: Partial<IProfile> & { phone?: string }) => {
  console.log("Updating profile for user:", userId, "Payload keys:", Object.keys(payload));
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const isUserExits = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found to update profile`);
  }

  if (isUserExits && !isUserExits?.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not verified`);
  }

  const result = await prisma.$transaction(async (transactor) => {
    if (payload.phone !== undefined) {
      await transactor.user.update({
        where: {
          id: userId,
        },
        data: {
          phone: payload.phone,
        },
      });
    }

    const profileUpdateData = {
      bio: payload.bio || "",
      location: payload.location || "",
      avatarUrl: payload.avatarUrl || "",
      coverUrl: payload.coverUrl || "",
      resumeUrl: payload.resumeUrl || "",
      linkedInUrl: payload.linkedInUrl || "",
      websiteUrl: payload.websiteUrl || "",
      githubUrl: payload.githubUrl || "",
      headline: payload.headline || "",
      totalExperienceYears: payload.totalExperienceYears
        ? Number(payload.totalExperienceYears)
        : undefined,
    };

    const userProfile = await transactor.profile.upsert({
      where: {
        userId: userId,
      },
      update: profileUpdateData,
      create: {
        ...profileUpdateData,
        userId: userId,
      },
    });

    // --- Helper function to strip extra fields ---
    const stripFields = (data: any) => {
      const { id, profileId, createdAt, updatedAt, ...rest } = data;
      return rest;
    };

    if (!isUserExits.profileId) {
      await transactor.user.update({
        where: {
          id: userId,
        },
        data: {
          profileId: userProfile.id,
        },
      });
    }

    if (payload.skills !== undefined && payload.skills.length > 0) {
      const currentSkillIds = payload.skills
        .filter((skill): skill is ISkill & { id: string } => !!skill.id)
        .map((skill: ISkill) => skill.id);

      await transactor.skill.deleteMany({
        where: {
          profileId: userProfile.id,
          NOT: {
            id: {
              in: currentSkillIds,
            },
          },
        },
      });

      for (const skill of payload.skills) {
        const skillData = {
          skillName: skill.skillName || (skill as any).skill || "",
          experienceYears: skill.experienceYears ? Number(skill.experienceYears) : 0,
        };
        if (skill.id) {
          await transactor.skill.update({
            where: { id: skill.id },
            data: skillData,
          });
        } else {
          await transactor.skill.create({
            data: { ...skillData, profileId: userProfile.id },
          });
        }
      }
    }

    if (payload.preference) {
      const cleanedPreference = stripFields(payload.preference);
      await transactor.preference.upsert({
        where: { profileId: userProfile.id },
        update: cleanedPreference,
        create: { ...cleanedPreference, profileId: userProfile.id },
      });
    }

    // --- Sync Education ---
    if (payload.education !== undefined) {
      const currentIds = payload.education.filter((e: any) => e.id).map((e: any) => e.id as string);
      await transactor.education.deleteMany({
        where: { profileId: userProfile.id, NOT: { id: { in: currentIds } } },
      });
      for (const edu of payload.education) {
        const cleanedData = stripFields(edu);
        // Map frontend fields to schema fields
        const mappedData = {
          institution: cleanedData.institute || cleanedData.institution,
          degree: cleanedData.degree,
          fieldOfStudy: cleanedData.fieldOfStudy,
          level: cleanedData.level,
          year: cleanedData.year,
          grade: cleanedData.result || cleanedData.grade,
          description: cleanedData.description,
        };

        const dates = {
          startDate: edu.startDate ? new Date(edu.startDate) : undefined,
          endDate: edu.endDate ? new Date(edu.endDate) : undefined,
        };
        if (edu.id) {
          await transactor.education.update({
            where: { id: edu.id },
            data: { ...mappedData, ...dates },
          });
        } else {
          await transactor.education.create({
            data: { ...mappedData, ...dates, profileId: userProfile.id },
          });
        }
      }
    }

    // --- Sync Work Experience ---
    if (payload.workExperiences !== undefined) {
      const currentIds = payload.workExperiences
        .filter((w: any) => w.id)
        .map((w: any) => w.id as string);
      await transactor.workExperience.deleteMany({
        where: { profileId: userProfile.id, NOT: { id: { in: currentIds } } },
      });
      for (const work of payload.workExperiences) {
        const cleanedData = stripFields(work);
        // Map frontend fields to schema fields
        const mappedData = {
          jobTitle: cleanedData.designation || cleanedData.jobTitle,
          company: cleanedData.company,
          location: cleanedData.location,
          employmentType: cleanedData.employmentType,
          description: cleanedData.description,
          current: cleanedData.currentlyWorking || cleanedData.current || false,
        };

        const dates = {
          startDate: work.startDate ? new Date(work.startDate) : undefined,
          endDate: work.endDate ? new Date(work.endDate) : undefined,
        };
        if (work.id) {
          await transactor.workExperience.update({
            where: { id: work.id },
            data: { ...mappedData, ...dates },
          });
        } else {
          await transactor.workExperience.create({
            data: { ...mappedData, ...dates, profileId: userProfile.id },
          });
        }
      }
    }

    // --- Sync Certifications ---
    if (payload.certifications !== undefined) {
      const currentIds = payload.certifications
        .filter((c: any) => c.id)
        .map((c: any) => c.id as string);
      await transactor.certification.deleteMany({
        where: { profileId: userProfile.id, NOT: { id: { in: currentIds } } },
      });
      for (const cert of payload.certifications) {
        const cleanedData = stripFields(cert);
        const mappedData = {
          name: cleanedData.name,
          issuingOrg: cleanedData.organization || cleanedData.issuingOrg,
          credentialId: cleanedData.credentialId,
          credentialUrl: cleanedData.credentialUrl,
        };
        const dates = {
          issueDate: cert.issueDate ? new Date(cert.issueDate) : undefined,
          expiryDate:
            (cert as any).expirationDate || cert.expiryDate
              ? new Date((cert as any).expirationDate || cert.expiryDate)
              : undefined,
        };
        if (cert.id) {
          await transactor.certification.update({
            where: { id: cert.id },
            data: { ...mappedData, ...dates },
          });
        } else {
          await transactor.certification.create({
            data: { ...mappedData, ...dates, profileId: userProfile.id },
          });
        }
      }
    }

    // --- Sync Projects ---
    if (payload.projects !== undefined) {
      const currentIds = payload.projects.filter((p: any) => p.id).map((p: any) => p.id as string);
      await transactor.project.deleteMany({
        where: { profileId: userProfile.id, NOT: { id: { in: currentIds } } },
      });
      for (const project of payload.projects) {
        const cleanedData = stripFields(project);
        const mappedData = {
          title: cleanedData.title,
          description: cleanedData.description,
          technologies: cleanedData.technologies || [],
          link: cleanedData.projectUrl || cleanedData.link,
          repoUrl: cleanedData.repoUrl,
        };
        const dates = {
          startDate: project.startDate ? new Date(project.startDate) : undefined,
          endDate: project.endDate ? new Date(project.endDate) : undefined,
        };
        if (project.id) {
          await transactor.project.update({
            where: { id: project.id },
            data: { ...mappedData, ...dates },
          });
        } else {
          await transactor.project.create({
            data: { ...mappedData, ...dates, profileId: userProfile.id },
          });
        }
      }
    }

    // --- Sync Address ---
    if (payload.address) {
      await transactor.address.upsert({
        where: { profileId: userProfile.id },
        update: payload.address,
        create: { ...payload.address, profileId: userProfile.id },
      });
    }

    // --- Sync Volunteer ---
    if (payload.volunteers !== undefined) {
      const currentIds = payload.volunteers
        .filter((v: any) => v.id)
        .map((v: any) => v.id as string);
      await transactor.volunteer.deleteMany({
        where: { profileId: userProfile.id, NOT: { id: { in: currentIds } } },
      });
      for (const vol of payload.volunteers) {
        const cleanedData = stripFields(vol);
        const mappedData = {
          role: cleanedData.role,
          organization: cleanedData.organization,
          description: cleanedData.description,
          current: cleanedData.currentlyVolunteering || cleanedData.current || false,
        };
        const dates = {
          startDate: vol.startDate ? new Date(vol.startDate) : undefined,
          endDate: vol.endDate ? new Date(vol.endDate) : undefined,
        };
        if (vol.id) {
          await transactor.volunteer.update({
            where: { id: vol.id },
            data: { ...mappedData, ...dates },
          });
        } else {
          await transactor.volunteer.create({
            data: { ...mappedData, ...dates, profileId: userProfile.id },
          });
        }
      }
    }

    // --- Sync Awards ---
    if (payload.awards !== undefined) {
      const currentIds = payload.awards.filter((a: any) => a.id).map((a: any) => a.id as string);
      await transactor.award.deleteMany({
        where: { profileId: userProfile.id, NOT: { id: { in: currentIds } } },
      });
      for (const award of payload.awards) {
        const cleanedData = stripFields(award);
        const mappedData = {
          title: cleanedData.title,
          issuer: cleanedData.organization || cleanedData.issuer,
          description: cleanedData.description,
        };
        const dateValue = award.date || award.issueDate;
        const dates = {
          issueDate: dateValue ? new Date(dateValue) : undefined,
        };
        if (award.id) {
          await transactor.award.update({
            where: { id: award.id },
            data: { ...mappedData, ...dates },
          });
        } else {
          await transactor.award.create({
            data: { ...mappedData, ...dates, profileId: userProfile.id },
          });
        }
      }
    }

    // --- Sync Publications ---
    if (payload.publications !== undefined) {
      const currentIds = payload.publications
        .filter((p: any) => p.id)
        .map((p: any) => p.id as string);
      await transactor.publication.deleteMany({
        where: { profileId: userProfile.id, NOT: { id: { in: currentIds } } },
      });
      for (const pub of payload.publications) {
        const cleanedData = stripFields(pub);
        const mappedData = {
          title: cleanedData.title,
          publisher: cleanedData.publisher,
          link: cleanedData.url || cleanedData.link,
          description: cleanedData.description,
        };
        const dateValue = pub.date || pub.publishDate;
        const dates = {
          publishDate: dateValue ? new Date(dateValue) : undefined,
        };
        if (pub.id) {
          await transactor.publication.update({
            where: { id: pub.id },
            data: { ...mappedData, ...dates },
          });
        } else {
          await transactor.publication.create({
            data: { ...mappedData, ...dates, profileId: userProfile.id },
          });
        }
      }
    }

    // --- Sync References ---
    if (payload.references !== undefined) {
      const currentIds = payload.references
        .filter((r: any) => r.id)
        .map((r: any) => r.id as string);
      await transactor.reference.deleteMany({
        where: { profileId: userProfile.id, NOT: { id: { in: currentIds } } },
      });
      for (const ref of payload.references) {
        const cleanedData = stripFields(ref);
        const mappedData = {
          name: cleanedData.name,
          relationship: cleanedData.relationship,
          company: cleanedData.company,
          position: cleanedData.position,
          email: cleanedData.email,
          phone: cleanedData.phone,
        };
        if (ref.id) {
          await transactor.reference.update({
            where: { id: ref.id },
            data: mappedData,
          });
        } else {
          await transactor.reference.create({
            data: { ...mappedData, profileId: userProfile.id },
          });
        }
      }
    }

    // --- Sync Languages ---
    if (payload.languages !== undefined) {
      const currentIds = payload.languages.filter((l: any) => l.id).map((l: any) => l.id as string);
      await transactor.language.deleteMany({
        where: { profileId: userProfile.id, NOT: { id: { in: currentIds } } },
      });
      for (const lang of payload.languages) {
        const cleanedData = stripFields(lang);
        if (lang.id) {
          await transactor.language.update({
            where: { id: lang.id },
            data: cleanedData,
          });
        } else {
          await transactor.language.create({
            data: { ...cleanedData, profileId: userProfile.id },
          });
        }
      }
    }

    return userProfile;
  });

  return result;
};

const saveJobs = async (userId: string, jobId: string) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const isUserExits = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found`);
  }

  if (isUserExits && !isUserExits?.isVerified) {
    // Temporarily disabled for local dev testing
    // throw new AppError(httpStatus.BAD_REQUEST, `User not verified`);
  }

  const jobExists = await prisma.job.findFirst({
    where: {
      id: jobId,
      deletedAt: null,
    },
  });

  if (!jobExists) {
    throw new AppError(httpStatus.NOT_FOUND, "Job not found");
  }

  const existingSavedJob = await prisma.savedJob.findUnique({
    where: {
      userId_jobId: {
        userId: userId,
        jobId: jobId,
      },
    },
  });

  if (existingSavedJob) {
    await prisma.savedJob.delete({
      where: {
        userId_jobId: {
          userId: userId,
          jobId: jobId,
        },
      },
    });

    return {
      action: "unsaved",
      message: "Job removed from saved jobs",
      savedJob: null,
    };
  } else {
    const result = await prisma.savedJob.create({
      data: {
        userId: userId,
        jobId: jobId,
      },
      include: {
        job: {
          include: {
            company: true,
            JobSkill: true,
          },
        },
      },
    });

    return {
      action: "saved",
      message: "Job saved successfully",
      savedJob: result,
    };
  }
};

const getSavedJobs = async (userId: string, query: any = {}) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const isUserExits = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found`);
  }

  const { page = 1, limit = 10, folderName, searchTerm, company, status } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const whereClause: any = {
    userId: userId,
    job: {
      deletedAt: null,
    },
  };

  if (folderName) {
    whereClause.folderName = folderName;
  }

  if (status && status !== "all") {
    if (status === "ACTIVE") {
      whereClause.job.status = { in: ["ACTIVE", "DRAFT"] };
    } else {
      whereClause.job.status = status;
    }
  }

  if (searchTerm) {
    whereClause.job.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { company: { name: { contains: searchTerm, mode: "insensitive" } } },
    ];
  }

  if (company && company !== "all") {
    if (whereClause.job.OR) {
      whereClause.job.company = { name: company };
    } else {
      whereClause.job.company = { name: company };
    }
  }

  const [savedJobs, total] = await Promise.all([
    prisma.savedJob.findMany({
      where: whereClause,
      include: {
        job: {
          include: {
            company: true,
            JobSkill: true,
            postedBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
      skip,
      take: Number(limit),
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.savedJob.count({
      where: whereClause,
    }),
  ]);

  return {
    savedJobs,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

const updateSavedJob = async (
  userId: string,
  jobId: string,
  payload: { folderName?: string; notes?: string },
) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  if (!jobId) {
    throw new Error("Job ID is required");
  }

  const isUserExits = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found`);
  }

  const savedJob = await prisma.savedJob.findUnique({
    where: {
      userId_jobId: {
        userId: userId,
        jobId: jobId,
      },
    },
  });

  if (!savedJob) {
    throw new AppError(httpStatus.NOT_FOUND, "Saved job not found");
  }

  const updateData: any = {};
  if (payload.folderName !== undefined) {
    updateData.folderName = payload.folderName;
  }
  if (payload.notes !== undefined) {
    updateData.notes = payload.notes;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No valid fields provided. Please provide 'folderName' or 'notes' to update.",
    );
  }

  const result = await prisma.savedJob.update({
    where: {
      userId_jobId: {
        userId: userId,
        jobId: jobId,
      },
    },
    data: updateData,
    include: {
      job: {
        include: {
          company: true,
          JobSkill: true,
        },
      },
    },
  });

  return result;
};

//****  for employee (saved profiles) ==========================> ****//

const profileService = {
  createProfile,
  myProfile,
  updateMyProfile,
  saveJobs,
  getSavedJobs,
  updateSavedJob,
};

export default profileService;
