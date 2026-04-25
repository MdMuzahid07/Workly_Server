/* eslint-disable @typescript-eslint/no-explicit-any */
import httpStatus from "http-status";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const getAllCandidates = async (query: any, employerId?: string) => {
  const {
    search,
    location,
    skills,
    industry,
    minExperience,
    maxExperience,
    sortBy = "fullName",
    sortOrder = "desc",
    page = 1,
    limit = 10,
  } = query;

  const skip = (Number(page) - 1) * Number(limit);

  // Build the main where clause
  const where: any = {
    role: "JOB_SEEKER",
    isActive: true,
    deletedAt: null,
  };

  // Build the profile where clause separately
  const profileWhere: any = {};
  let hasProfileFilter = false;

  if (location) {
    profileWhere.location = { contains: location, mode: "insensitive" };
    hasProfileFilter = true;
  }

  if (skills && typeof skills === "string" && skills.trim().length > 0) {
    const skillsList = skills
      .split(",")
      .map((s: string) => s.trim())
      .filter((s) => s.length > 0);
    if (skillsList.length > 0) {
      profileWhere.skills = {
        some: {
          skillName: { in: skillsList, mode: "insensitive" },
        },
      };
      hasProfileFilter = true;
    }
  }

  if (industry) {
    profileWhere.preference = {
      industry: { contains: industry, mode: "insensitive" },
    };
    hasProfileFilter = true;
  }

  if (minExperience !== undefined || maxExperience !== undefined) {
    const minExp = minExperience !== undefined ? parseFloat(minExperience) : undefined;
    const maxExp = maxExperience !== undefined ? parseFloat(maxExperience) : undefined;

    if (!isNaN(minExp as any) || !isNaN(maxExp as any)) {
      profileWhere.totalExperienceYears = {
        gte: isNaN(minExp as any) ? undefined : minExp,
        lte: isNaN(maxExp as any) ? undefined : maxExp,
      };
      hasProfileFilter = true;
    }
  }

  // Combine filters
  if (hasProfileFilter) {
    where.profile = profileWhere;
  }

  if (search) {
    const searchConditions = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { profile: { headline: { contains: search, mode: "insensitive" } } },
      { profile: { bio: { contains: search, mode: "insensitive" } } },
      { profile: { skills: { some: { skillName: { contains: search, mode: "insensitive" } } } } },
    ];

    if (where.OR) {
      where.AND = [{ OR: searchConditions }, { ...where }];
      delete where.OR;
      delete where.role;
      delete where.isActive;
      delete where.deletedAt;
      delete where.profile;
    } else {
      where.OR = searchConditions;
    }
  }

  try {
    // Build include object dynamically
    const include: any = {
      profile: {
        include: {
          skills: true,
          preference: true,
        },
      },
    };

    if (employerId) {
      include.candidateSaves = {
        where: { employerId },
        select: { id: true },
      };
    }

    const [candidates, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include,
        skip,
        take: Number(limit),
        orderBy: sortBy === "fullName" ? { fullName: sortOrder } : { [sortBy]: sortOrder },
      }),
      prisma.user.count({ where }),
    ]);

    const result = candidates.map((user) => {
      const { passwordHash, candidateSaves, ...rest } = user as any;
      return {
        ...rest,
        isSaved:
          (candidateSaves && Array.isArray(candidateSaves) && candidateSaves.length > 0) || false,
      };
    });

    return {
      data: result,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  } catch (err: any) {
    // Log the error for internal tracking
    console.error("Prisma Error in getAllCandidates:", err);
    // Return a slightly more detailed error message to help the user identify the field causing issues
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Database error: " + err.message);
  }
};

const getCandidateById = async (id: string, employerId?: string) => {
  try {
    const include: any = {
      profile: {
        include: {
          skills: true,
          preference: true,
          education: true,
          workExperiences: {
            orderBy: { startDate: "desc" },
          },
          certifications: true,
        },
      },
      resumes: true,
    };

    if (employerId) {
      include.candidateSaves = {
        where: { employerId },
        select: { id: true },
      };
    }

    const candidate = await prisma.user.findUnique({
      where: {
        id,
        role: "JOB_SEEKER",
        isActive: true,
        deletedAt: null,
      },
      include,
    });

    if (!candidate) {
      throw new AppError(httpStatus.NOT_FOUND, "Candidate not found");
    }

    const { passwordHash, candidateSaves, ...rest } = candidate as any;
    return {
      ...rest,
      isSaved:
        (candidateSaves && Array.isArray(candidateSaves) && candidateSaves.length > 0) || false,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error("Prisma Error in getCandidateById:", err);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Database error details: " + err.message);
  }
};

const toggleSaveCandidate = async (employerId: string, candidateId: string) => {
  const candidate = await prisma.user.findUnique({
    where: { id: candidateId, role: "JOB_SEEKER", isActive: true },
  });

  if (!candidate) {
    throw new AppError(httpStatus.NOT_FOUND, "Candidate not found");
  }

  const existingSave = await prisma.savedCandidate.findUnique({
    where: {
      employerId_candidateId: {
        employerId,
        candidateId,
      },
    },
  });

  if (existingSave) {
    await prisma.savedCandidate.delete({
      where: {
        employerId_candidateId: {
          employerId,
          candidateId,
        },
      },
    });
    return { action: "unsaved", message: "Candidate profile unsaved" };
  } else {
    await prisma.savedCandidate.create({
      data: {
        employerId,
        candidateId,
      },
    });
    return { action: "saved", message: "Candidate profile saved" };
  }
};

const getSavedCandidates = async (employerId: string, query: any) => {
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  const [saved, total] = await Promise.all([
    prisma.savedCandidate.findMany({
      where: { employerId },
      include: {
        candidate: {
          include: {
            profile: {
              include: {
                skills: true,
                preference: true,
              },
            },
          },
        },
      },
      skip,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    }),
    prisma.savedCandidate.count({ where: { employerId } }),
  ]);

  return {
    data: saved.map((s) => {
      const { passwordHash, ...rest } = s.candidate as any;
      return {
        ...rest,
        isSaved: true,
      };
    }),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

const candidateService = {
  getAllCandidates,
  getCandidateById,
  toggleSaveCandidate,
  getSavedCandidates,
};

export default candidateService;
