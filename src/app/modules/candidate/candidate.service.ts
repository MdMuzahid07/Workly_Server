import httpStatus from 'http-status';
import prisma from '../../../utils/prismaClient.js';
import AppError from '../../error/AppError.js';

const getAllCandidates = async (query: any, employerId?: string) => {
  const {
    search,
    location,
    skills,
    industry,
    minExperience,
    maxExperience,
    sortBy = 'fullName',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
  } = query;

  const skip = (Number(page) - 1) * Number(limit);

  // Build the main where clause
  const where: any = {
    role: 'JOB_SEEKER',
    isActive: true,
    deletedAt: null,
  };

  // Build the profile where clause separately
  const profileWhere: any = {};
  let hasProfileFilter = false;

  if (location) {
    profileWhere.location = { contains: location, mode: 'insensitive' };
    hasProfileFilter = true;
  }

  if (skills && typeof skills === 'string' && skills.trim().length > 0) {
    const skillsList = skills
      .split(',')
      .map((s: string) => s.trim())
      .filter((s) => s.length > 0);
    if (skillsList.length > 0) {
      profileWhere.skills = {
        some: {
          skillName: { in: skillsList, mode: 'insensitive' },
        },
      };
      hasProfileFilter = true;
    }
  }

  if (industry) {
    profileWhere.preference = {
      industry: { contains: industry, mode: 'insensitive' },
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
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { profile: { headline: { contains: search, mode: 'insensitive' } } },
      { profile: { bio: { contains: search, mode: 'insensitive' } } },
      { profile: { skills: { some: { skillName: { contains: search, mode: 'insensitive' } } } } },
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
        orderBy: sortBy === 'fullName' ? { fullName: sortOrder } : { [sortBy]: sortOrder },
      }),
      prisma.user.count({ where }),
    ]);

    const result = candidates.map((user) => {
      const { candidateSaves, ...rest } = user as typeof user & {
        candidateSaves?: { id: string }[];
      };
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
    console.error('Prisma Error in getAllCandidates:', err);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Database error: ' + err.message);
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
            orderBy: { startDate: 'desc' },
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
        isActive: true,
        deletedAt: null,
      },
      include,
    });

    if (!candidate) {
      throw new AppError(httpStatus.NOT_FOUND, 'Candidate not found');
    }

    const { candidateSaves, ...rest } = candidate as typeof candidate & {
      candidateSaves?: { id: string }[];
    };
    return {
      ...rest,
      isSaved:
        (candidateSaves && Array.isArray(candidateSaves) && candidateSaves.length > 0) || false,
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error('Prisma Error in getCandidateById:', err);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Database error: ' + err.message);
  }
};

const toggleSaveCandidate = async (employerId: string, candidateId: string) => {
  try {
    const candidate = await prisma.user.findUnique({
      where: { id: candidateId, isActive: true },
    });

    if (!candidate) {
      throw new AppError(httpStatus.NOT_FOUND, 'Candidate user not found');
    }

    // Check if it's already saved using findFirst to be safe about index names
    const existingSave = await prisma.savedCandidate.findFirst({
      where: {
        employerId,
        candidateId,
      },
    });

    if (existingSave) {
      await prisma.savedCandidate.delete({
        where: {
          id: existingSave.id,
        },
      });
      return { action: 'unsaved', message: 'Candidate profile unsaved' };
    } else {
      await prisma.savedCandidate.create({
        data: {
          employer: { connect: { id: employerId } },
          candidate: { connect: { id: candidateId } },
        },
      });
      return { action: 'saved', message: 'Candidate profile saved' };
    }
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error('Prisma Error in toggleSaveCandidate:', err);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Database error: ' + err.message);
  }
};

const getSavedCandidates = async (employerId: string, query: any) => {
  const { page = 1, limit = 10 } = query;
  const skip = (Number(page) - 1) * Number(limit);

  try {
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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.savedCandidate.count({ where: { employerId } }),
    ]);

    return {
      data: saved.map((s) => {
        const rest = s.candidate;
        return {
          ...rest,
          isSaved: true,
          savedAt: s.createdAt,
        };
      }),
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    };
  } catch (err: any) {
    console.error('Prisma Error in getSavedCandidates:', err);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Database error: ' + err.message);
  }
};

const getCandidateSkillFacets = async (query: {
  location?: string;
  industry?: string;
  search?: string;
  limit?: string | number;
}) => {
  const { location, industry, search, limit } = query;

  const profileWhere: any = {
    user: {
      role: 'JOB_SEEKER',
      isActive: true,
      deletedAt: null,
    },
  };

  if (location && location.trim()) {
    profileWhere.location = { contains: location.trim(), mode: 'insensitive' };
  }

  if (industry && industry.trim()) {
    profileWhere.preference = { industry: { contains: industry.trim(), mode: 'insensitive' } };
  }

  if (search && search.trim()) {
    profileWhere.user = {
      role: 'JOB_SEEKER',
      isActive: true,
      deletedAt: null,
      OR: [
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ],
    };
  }

  const facets = await prisma.skill.groupBy({
    by: ['skillName'],
    where: {
      profile: profileWhere,
    },
    _count: {
      skillName: true,
    },
    orderBy: {
      _count: {
        skillName: 'desc',
      },
    },
    take: limit ? parseInt(String(limit)) : 50,
  });

  return facets.map((f) => ({
    skillName: f.skillName,
    count: f._count.skillName,
  }));
};

const getCandidateLocationFacets = async (query: {
  skills?: string;
  industry?: string;
  search?: string;
  limit?: string | number;
}) => {
  const { skills, industry, search, limit } = query;

  const profileWhere: any = {
    user: {
      role: 'JOB_SEEKER',
      isActive: true,
      deletedAt: null,
    },
    location: { not: null },
  };

  if (industry && industry.trim()) {
    profileWhere.preference = { industry: { contains: industry.trim(), mode: 'insensitive' } };
  }

  if (skills && skills.trim()) {
    const skillsList = skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skillsList.length > 0) {
      profileWhere.skills = {
        some: { skillName: { in: skillsList, mode: 'insensitive' } },
      };
    }
  }

  if (search && search.trim()) {
    profileWhere.user = {
      role: 'JOB_SEEKER',
      isActive: true,
      deletedAt: null,
      OR: [
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ],
    };
  }

  const facets = await prisma.profile.groupBy({
    by: ['location'],
    where: profileWhere,
    _count: {
      location: true,
    },
    orderBy: {
      _count: {
        location: 'desc',
      },
    },
    take: limit ? parseInt(String(limit)) : 50,
  });

  return facets
    .filter((f) => f.location && f.location.trim().length > 0)
    .map((f) => ({
      location: f.location as string,
      count: f._count.location,
    }));
};

const candidateService = {
  getAllCandidates,
  getCandidateById,
  toggleSaveCandidate,
  getSavedCandidates,
  getCandidateSkillFacets,
  getCandidateLocationFacets,
};

export default candidateService;
