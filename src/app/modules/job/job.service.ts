import httpStatus from "http-status";
import { type Job, type JobSkill } from "../../../generated/prisma/index.js";
import factoryFunctions from "../../../utils/FactoryFunctionsWithFilterEngine.js";
import generateUniqueSlug from "../../../utils/generateUniqueSlug.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";
import { EntitlementService } from "../../../services/entitlement.service.js";

//* ============ helper functions ============>

const parseArray = (value: any) => {
  if (!value) return undefined;
  return Array.isArray(value) ? value : value.split(",").map((v: string) => v.trim());
};

const parseBool = (value: any) => {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
};

const getDateFromPeriod = (period: string) => {
  const now = new Date();
  const periods: Record<string, number> = {
    "24h": 1,
    "3d": 3,
    "1w": 7,
    "1m": 30,
  };
  const days = periods[period];
  return days ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000) : null;
};

const getPublicJobUnavailableReason = (
  job: Pick<Job, "status" | "deletedAt" | "applicationDeadline" | "expiresAt">,
) => {
  const now = new Date();

  if (job.deletedAt) return "Job not found";
  if (job.status !== "ACTIVE") return "Job not found";
  if (job.applicationDeadline && job.applicationDeadline <= now) {
    return "This job is no longer accepting applications";
  }
  if (job.expiresAt && job.expiresAt <= now) {
    return "This job posting has expired";
  }

  return null;
};

const canUserManageJob = async (
  userId: string | null | undefined,
  job: Pick<Job, "postedById" | "companyId">,
) => {
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    select: { id: true, role: true, companyId: true },
  });

  if (!user) return false;
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;

  return user.id === job.postedById || (!!user.companyId && user.companyId === job.companyId);
};

//* ===================== services =========================>

const createJob = async (userId: string, payload: Job & { skillsRequired: JobSkill[] }) => {
  if (!userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Not authorized");
  }

  const isUserExits = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      company: true,
    },
  });

  if (!isUserExits || !isUserExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found to create a job`);
  }

  if (isUserExits && !isUserExits?.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not verified`);
  }

  const allowedRoles = ["ADMIN", "EMPLOYER", "SUPER_ADMIN"];
  if (!allowedRoles.includes(isUserExits.role)) {
    throw new AppError(httpStatus.FORBIDDEN, "Only employers and admins can create jobs");
  }

  if (isUserExits.role !== "SUPER_ADMIN") {
    if (!isUserExits.company || isUserExits.companyId !== payload.companyId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You are not authorized to post jobs for this company",
      );
    }
  }

  const isCompanyExists = await prisma.company.findUnique({
    where: {
      id: payload.companyId,
      isVerified: true,
      deletedAt: null,
    },
  });

  if (!isCompanyExists) {
    throw new AppError(httpStatus.BAD_REQUEST, "Company not found or not verified");
  }

  // Enforce 1 active job limit for free (non-premium) employers (only in production)
  if (
    process.env.NODE_ENV === "production" &&
    !isUserExits.isPremium &&
    payload.status === "ACTIVE"
  ) {
    const activeJobsCount = await prisma.job.count({
      where: {
        postedById: userId,
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    if (activeJobsCount >= 1) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Free plan is limited to 1 active job posting. Upgrade to Starter or Professional to post more.",
      );
    }
  }

  const existingJob = await prisma.job.findFirst({
    where: { jobType: payload.jobType, title: payload.title, companyId: payload.companyId },
  });

  if (existingJob) {
    throw new AppError(httpStatus.CONFLICT, "This job is already posted for this company");
  }

  const { skillsRequired, ...rest } = payload;

  const slug = await generateUniqueSlug(payload.title, "job");

  const result = await prisma.$transaction(async (transactor) => {
    const job = await transactor.job.create({
      data: {
        ...rest,
        postedById: userId,
        companyId: rest.companyId,
        slug,
        status: rest.status ?? "DRAFT",
      },
    });

    if (skillsRequired && skillsRequired.length > 0) {
      await transactor.jobSkill.createMany({
        data: skillsRequired.map((skill) => ({
          jobId: job.id,
          experienceYears: skill.experienceYears,
          skillName: skill.skillName,
          isRequired: skill.isRequired,
          priority: skill.priority,
          description: skill.description,
        })),
      });
    }

    const updatedJob = await transactor.job.findUnique({
      where: {
        id: job.id,
      },
      include: {
        JobSkill: true,
        postedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        company: true,
      },
    });

    return updatedJob;
  });

  await EntitlementService.incrementUsage(userId, "jobsPosted");

  return result;
};

const getJobs = async (
  query: any,
  currentUserId?: string | null,
  options: { publicOnly?: boolean } = { publicOnly: true },
) => {
  const {
    search,
    location,
    jobType,
    experienceLevel,
    skills,
    industry,
    isRemote,
    isFeatured,
    salaryMin,
    salaryMax,
    postedWithin,
    status,
    companyId,
    sortBy = "createdAt",
    sortOrder = "desc",
    page,
    limit,
  } = query;

  // build filter query ==========>
  const filterQuery: any = {
    sortBy,
    sortOrder,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    where: {},
    whereIn: {},
  };

  if (options.publicOnly) {
    filterQuery.where.status = "ACTIVE";
    filterQuery.customWhere = {
      AND: [
        {
          OR: [{ applicationDeadline: null }, { applicationDeadline: { gt: new Date() } }],
        },
        {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      ],
    };
  }

  // text search ===============>
  if (search) {
    filterQuery.search = search.trim();
    filterQuery.searchIn = ["title", "discipline", "requirements"];
  }

  // exact matches =============>
  if (companyId) filterQuery.where.companyId = companyId;

  if (!options.publicOnly && status) {
    filterQuery.where.status = status;
  }

  const remote = parseBool(isRemote);
  if (remote !== undefined) filterQuery.where.isRemote = remote;

  const featured = parseBool(isFeatured);
  if (featured !== undefined) filterQuery.where.isFeatured = featured;

  // array filters ===============>
  const jobTypes = parseArray(jobType);
  if (jobTypes?.length) filterQuery.whereIn.jobType = jobTypes;

  const levels = parseArray(experienceLevel);
  if (levels?.length) filterQuery.whereIn.experienceLevel = levels;

  // salary range ===============>
  if (salaryMin || salaryMax) {
    filterQuery.range = {};
    if (salaryMin) filterQuery.range.salaryMin = { min: parseInt(salaryMin) };
    if (salaryMax) filterQuery.range.salaryMax = { max: parseInt(salaryMax) };
  }

  // date range ========================>
  if (postedWithin) {
    const startDate = getDateFromPeriod(postedWithin);
    if (startDate) {
      filterQuery.dateRange = {
        createdAt: { start: startDate, end: new Date() },
      };
    }
  }

  // execute filterEngine ================>
  const jobFilter = factoryFunctions.createJobFilter(prisma);
  const { where, orderBy, skip, take, pagination } = await jobFilter.filter(filterQuery);

  if (location && location.trim()) {
    where.location = {
      contains: location.trim(),
      mode: "insensitive",
    };
  }

  const skillsList = parseArray(skills);
  if (skillsList?.length) {
    where.JobSkill = {
      some: {
        skillName: { in: skillsList, mode: "insensitive" },
      },
    };
  }

  // Industry filter (relation with company or direct on Job)
  const industries = parseArray(industry);
  if (industries?.length) {
    if (!where.AND) {
      where.AND = [];
    }
    where.AND.push({
      OR: [
        { industry: { name: { in: industries, mode: "insensitive" } } },
        { company: { industry: { name: { in: industries, mode: "insensitive" } } } },
      ],
    });
  }

  const result = await prisma.job.findMany({
    where,
    orderBy,
    skip,
    take,
    include: {
      JobSkill: true,
      industry: true,
      postedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      company: true,
      _count: {
        select: {
          applications: true,
        },
      },
    },
  });

  let dataWithSavedStatus = result;
  if (currentUserId) {
    const savedJobs = await prisma.savedJob.findMany({
      where: { userId: currentUserId, jobId: { in: result.map((j) => j.id) } },
      select: { jobId: true },
    });
    const savedJobIds = new Set(savedJobs.map((sj) => sj.jobId));

    dataWithSavedStatus = result.map((job) => ({
      ...job,
      isSaved: savedJobIds.has(job.id),
    })) as any;
  }

  return { data: dataWithSavedStatus, meta: pagination };
};

// };

const getMyJobs = async (userId: string, query: any) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
  });

  if (!user || !user.companyId) {
    throw new AppError(httpStatus.NOT_FOUND, "Company not found for this user");
  }

  // Force companyId to be the employer's companyId
  query.companyId = user.companyId;

  // Use the existing getJobs logic which handles all sorting, pagination, etc.
  return getJobs(query, userId, { publicOnly: false });
};

const getJobById = async (jobId: string, currentUserId?: string | null) => {
  const result = await prisma.job.findUnique({
    where: {
      id: jobId,
    },
    include: {
      JobSkill: true,
      industry: true,
      postedBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      company: {
        include: {
          _count: {
            select: {
              employees: true,
              jobs: true,
            },
          },
        },
      },
      Benefits: true,
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Job not found");
  }

  const canManageJob = await canUserManageJob(currentUserId, result);
  if (!canManageJob) {
    const unavailableReason = getPublicJobUnavailableReason(result);
    if (unavailableReason) {
      throw new AppError(httpStatus.NOT_FOUND, unavailableReason);
    }
  }

  let isSaved = false;
  if (currentUserId) {
    const savedJob = await prisma.savedJob.findUnique({
      where: {
        userId_jobId: { userId: currentUserId, jobId: result.id },
      },
    });
    if (savedJob) isSaved = true;
  }

  return { ...result, isSaved };
};

const updateJob = async (
  userId: string,
  jobId: string,
  payload: Job & { skillsRequired: JobSkill[] },
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  if (!user || !user.isActive || !user.isVerified) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not authorized");
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId, deletedAt: null },
    include: { company: true },
  });

  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, "Job not found");
  }

  const isUserCanUpdate = job.postedById === userId || user.companyId === job.companyId;

  if (!isUserCanUpdate) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to update this job");
  }

  // Enforce 1 active job limit for free (non-premium) employers when activating a job (only in production)
  if (
    process.env.NODE_ENV === "production" &&
    !user.isPremium &&
    payload.status === "ACTIVE" &&
    job.status !== "ACTIVE"
  ) {
    const activeJobsCount = await prisma.job.count({
      where: {
        postedById: userId,
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    if (activeJobsCount >= 1) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Free plan is limited to 1 active job posting. Upgrade to Starter or Professional to post more.",
      );
    }
  }

  const { skillsRequired, ...jobData } = payload;

  const result = await prisma.$transaction(async (transactor) => {
    await transactor.job.update({
      where: { id: jobId },
      data: {
        ...jobData,
        updatedAt: new Date(),
      },
    });

    if (skillsRequired !== undefined && skillsRequired.length >= 0) {
      const currentSkillIds = skillsRequired
        .filter((skill): skill is JobSkill & { id: string } => !!skill.id)
        .map((skill: JobSkill) => skill.id);

      await transactor.jobSkill.deleteMany({
        where: {
          jobId,
          NOT: {
            id: {
              in: currentSkillIds,
            },
          },
        },
      });

      for (const skill of skillsRequired) {
        if (skill.id) {
          await transactor.jobSkill.upsert({
            where: {
              id: skill.id,
            },
            update: {
              skillName: skill.skillName,
              experienceYears: skill.experienceYears,
              isRequired: skill.isRequired ?? true,
              priority: skill.priority ?? "HIGH",
              description: skill.description,
            },
            create: {
              jobId,
              skillName: skill.skillName,
              experienceYears: skill.experienceYears,
              isRequired: skill.isRequired ?? true,
              priority: skill.priority ?? "HIGH",
              description: skill.description,
            },
          });
        } else {
          await transactor.jobSkill.create({
            data: {
              jobId,
              skillName: skill.skillName,
              experienceYears: skill.experienceYears,
              isRequired: skill.isRequired ?? true,
              priority: skill.priority ?? "HIGH",
              description: skill.description,
            },
          });
        }
      }
    }

    return transactor.job.findUnique({
      where: { id: jobId },
      include: {
        JobSkill: true,
        company: true,
        postedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  });

  return result;
};

const deleteJob = async (userId: string, jobId: string) => {
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
    throw new AppError(httpStatus.BAD_REQUEST, `User not verified`);
  }

  const isJobExists = await prisma.job.findUnique({
    where: {
      id: jobId,
      deletedAt: null,
    },
  });

  if (!isJobExists) {
    throw new AppError(httpStatus.NOT_FOUND, "Job not found");
  }

  if (isJobExists.postedById !== userId && isJobExists.companyId !== isUserExits.companyId) {
    throw new AppError(httpStatus.FORBIDDEN, "You are not authorized to delete this job");
  }

  if (isJobExists?.status === "ACTIVE") {
    throw new AppError(httpStatus.BAD_REQUEST, "Job is active, cannot delete");
  }

  const result = await prisma.job.update({
    where: {
      id: jobId,
    },
    data: {
      deletedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return result;
};

const getRecommendedJobs = async (userId: string, query: any) => {
  const { page = 1, limit = 10, search } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    include: {
      profile: {
        include: {
          skills: true,
        },
      },
    },
  });

  if (!user || !user.profile) {
    throw new AppError(httpStatus.NOT_FOUND, "User profile not found");
  }

  const userSkillNames = user.profile.skills.map((s) => s.skillName.toLowerCase());

  // If user has no skills, return recent active jobs (with search applied if provided)
  if (userSkillNames.length === 0) {
    const whereClause: any = { status: "ACTIVE", deletedAt: null };
    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      whereClause.OR = [
        { title: { contains: trimmedSearch, mode: "insensitive" } },
        { description: { contains: trimmedSearch, mode: "insensitive" } },
        { company: { name: { contains: trimmedSearch, mode: "insensitive" } } },
        {
          JobSkill: {
            some: {
              skillName: { contains: trimmedSearch, mode: "insensitive" },
            },
          },
        },
      ];
    }
    const jobs = await prisma.job.findMany({
      where: whereClause,
      include: { JobSkill: true, company: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
    const total = await prisma.job.count({ where: whereClause });
    return {
      data: jobs.map((j) => ({ ...j, matchScore: 70, matchReason: "Relevant for your profile." })),
      meta: { page: parseInt(page), limit: take, total, pages: Math.ceil(total / take) },
    };
  }

  // Matching logic: Find jobs with overlapping skills
  const baseConditions: any[] = [
    {
      JobSkill: {
        some: {
          skillName: { in: userSkillNames, mode: "insensitive" },
        },
      },
    },
  ];
  if (userSkillNames[0]) {
    baseConditions.push({
      title: {
        contains: userSkillNames[0],
        mode: "insensitive",
      },
    });
  }

  const whereClause: any = {
    status: "ACTIVE",
    deletedAt: null,
  };

  if (search && search.trim()) {
    const trimmedSearch = search.trim();
    const searchConditions = {
      OR: [
        { title: { contains: trimmedSearch, mode: "insensitive" } },
        { description: { contains: trimmedSearch, mode: "insensitive" } },
        { company: { name: { contains: trimmedSearch, mode: "insensitive" } } },
        {
          JobSkill: {
            some: {
              skillName: { contains: trimmedSearch, mode: "insensitive" },
            },
          },
        },
      ],
    };
    whereClause.AND = [{ OR: baseConditions }, searchConditions];
  } else {
    whereClause.OR = baseConditions;
  }

  const matchingJobs = await prisma.job.findMany({
    where: whereClause,
    include: {
      JobSkill: true,
      company: true,
    },
  });

  // Calculate match scores and filter/sort
  const scoredJobs = matchingJobs
    .map((job) => {
      const jobSkillNames = job.JobSkill.map((s) => s.skillName.toLowerCase());
      const matches = jobSkillNames.filter((s) => userSkillNames.includes(s));
      const matchCount = matches.length;

      // Score calculation: (matches / required) * 100
      let matchScore = 0;
      if (jobSkillNames.length > 0) {
        matchScore = Math.round((matchCount / jobSkillNames.length) * 100);
      } else {
        matchScore = 75; // Baseline if no skills defined for job
      }

      // Cap score at 100
      matchScore = Math.min(matchScore, 100);
      // Ensure a decent base score for relevant matches
      if (matchCount > 0 && matchScore < 60) matchScore = 65;

      return {
        ...job,
        matchScore,
        matchReason:
          matchCount > 0
            ? `Matches ${matchCount} of the required skills for this position.`
            : "Matches your career interests and background.",
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);

  const paginatedData = scoredJobs.slice(skip, skip + take);
  const total = scoredJobs.length;

  return {
    data: paginatedData,
    meta: {
      page: parseInt(page),
      limit: take,
      total,
      pages: Math.ceil(total / take),
    },
  };
};

const getSearchSuggestions = async (query: Record<string, unknown>) => {
  const keyword = (query.keyword as string)?.trim() ?? "";
  const location = (query.location as string)?.trim() ?? "";

  const results: { keywords: string[]; locations: string[] } = {
    keywords: [],
    locations: [],
  };

  if (!keyword && !location) {
    return results;
  }

  // Get active jobs to query matching suggestions
  const activeWhere: any = {
    status: "ACTIVE",
    deletedAt: null,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };

  if (keyword) {
    // Search unique job titles or disciplines
    const matchingJobs = await prisma.job.findMany({
      where: {
        ...activeWhere,
        OR: [
          { title: { contains: keyword, mode: "insensitive" } },
          { discipline: { contains: keyword, mode: "insensitive" } },
        ],
      },
      select: {
        title: true,
        discipline: true,
      },
      take: 20,
    });

    const suggestions = new Set<string>();
    matchingJobs.forEach((job) => {
      if (job.title && job.title.toLowerCase().includes(keyword.toLowerCase())) {
        suggestions.add(job.title);
      }
      if (job.discipline && job.discipline.toLowerCase().includes(keyword.toLowerCase())) {
        suggestions.add(job.discipline);
      }
    });

    // Also look up matching category names
    const matchingCategories = await prisma.industry.findMany({
      where: {
        isDeleted: false,
        name: { contains: keyword, mode: "insensitive" },
      },
      select: {
        name: true,
      },
      take: 5,
    });

    matchingCategories.forEach((cat) => suggestions.add(cat.name));

    results.keywords = Array.from(suggestions).slice(0, 8);
  }

  if (location) {
    const matchingJobs = await prisma.job.findMany({
      where: {
        ...activeWhere,
        location: { contains: location, mode: "insensitive" },
      },
      select: {
        location: true,
      },
      distinct: ["location"],
      take: 8,
    });

    results.locations = matchingJobs.map((job) => job.location).filter(Boolean);
  }

  return results;
};

const jobService = {
  createJob,
  getJobs,
  getMyJobs,
  getJobById,
  updateJob,
  deleteJob,
  getRecommendedJobs,
  getSearchSuggestions,
};

export default jobService;
