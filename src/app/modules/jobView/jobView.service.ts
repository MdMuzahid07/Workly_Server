import prisma from "../../../utils/prismaClient.js";

const logJobView = async (jobId: string, userId?: string, ip?: string, userAgent?: string) => {
  // If user is logged in, we can check if they already viewed this job recently to avoid duplicates
  // but usually for history we want to show most recent views.

  const result = await prisma.jobView.create({
    data: {
      jobId,
      userId,
      ipAddress: ip,
      userAgent: userAgent,
    },
  });

  return result;
};

const getJobViewHistory = async (
  userId: string,
  query: { searchTerm?: string; jobType?: string } = {},
) => {
  const { searchTerm, jobType } = query;

  const whereClause: any = {
    userId,
    job: {
      deletedAt: null,
    },
  };

  if (jobType && jobType !== "all") {
    whereClause.job.jobType = jobType;
  }

  if (searchTerm) {
    whereClause.job.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { company: { name: { contains: searchTerm, mode: "insensitive" } } },
    ];
  }

  const history = await prisma.jobView.findMany({
    where: whereClause,
    take: 100,
    orderBy: { viewedAt: "desc" },
    include: {
      job: {
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              location: true,
            },
          },
          JobSkill: true,
        },
      },
    },
  });

  // Filter out duplicates to show unique jobs in history, or just return as is.
  // For history, it's often better to show unique jobs viewed recently.
  const uniqueJobs = Array.from(new Map(history.map((item) => [item.jobId, item])).values());

  return uniqueJobs;
};

export const jobViewService = {
  logJobView,
  getJobViewHistory,
};
