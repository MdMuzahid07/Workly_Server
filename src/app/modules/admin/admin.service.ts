import httpStatus from "http-status";
import AppError from "../../error/AppError.js";
import prisma from "../../../utils/prismaClient.js";

type EmployerStatus = "Verified" | "Pending" | "Suspended";

const companyStatusFrom = (company: { isVerified: boolean }, owner: { isActive: boolean }) => {
  if (!owner.isActive) return "Suspended" as const;
  return company.isVerified ? ("Verified" as const) : ("Pending" as const);
};

async function findCompanyOwner(companyId: string) {
  // There is no explicit owner field in schema. Use the earliest EMPLOYER user in this company.
  const owner = await prisma.user.findFirst({
    where: { companyId, role: "EMPLOYER", deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, email: true, isActive: true, createdAt: true },
  });
  return owner;
}

const getEmployerStats = async () => {
  const [totalEmployers, verifiedCompanies, pendingVerification, activeJobs] = await Promise.all([
    prisma.company.count({ where: { deletedAt: null } }),
    prisma.company.count({ where: { deletedAt: null, isVerified: true } }),
    prisma.company.count({ where: { deletedAt: null, isVerified: false } }),
    prisma.job.count({ where: { deletedAt: null, status: "ACTIVE" } }),
  ]);

  return {
    totalEmployers,
    verifiedCompanies,
    pendingVerification,
    activeJobs,
  };
};

const getEmployersList = async (query: {
  page: number;
  limit: number;
  q?: string;
  status?: EmployerStatus;
}) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;
  const q = query.q?.trim();

  // Base company filter (soft-delete aware)
  const companyWhere: any = { deletedAt: null };
  if (q) {
    companyWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { contactEmail: { contains: q, mode: "insensitive" } },
    ];
  }

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where: companyWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        createdAt: true,
        isVerified: true,
        industry: { select: { name: true } },
      },
    }),
    prisma.company.count({ where: companyWhere }),
  ]);

  const rows = await Promise.all(
    companies.map(async (c) => {
      const owner = await findCompanyOwner(c.id);
      const activeJobs = await prisma.job.count({
        where: { companyId: c.id, deletedAt: null, status: "ACTIVE" },
      });

      const safeOwner =
        owner ??
        ({
          id: null,
          fullName: "—",
          email: "—",
          isActive: true,
          createdAt: c.createdAt,
        } as any);

      const status = companyStatusFrom(
        { isVerified: c.isVerified },
        { isActive: safeOwner.isActive },
      );

      return {
        id: c.id,
        companyName: c.name,
        slug: c.slug,
        logo: c.logoUrl ?? "",
        industry: c.industry?.name ?? "—",
        ownerId: safeOwner.id,
        ownerName: safeOwner.fullName,
        ownerEmail: safeOwner.email,
        status,
        activeJobs,
        joinedDate: c.createdAt,
        isCompanyVerified: c.isVerified,
        isOwnerActive: safeOwner.isActive,
      };
    }),
  );

  const filtered = query.status == null ? rows : rows.filter((r) => r.status === query.status);

  // If status is applied, pagination meta should reflect filtered count
  const filteredTotal = query.status == null ? total : filtered.length;

  return {
    data: filtered,
    meta: {
      page,
      limit,
      total: filteredTotal,
      totalPage: Math.ceil(filteredTotal / limit) || 1,
    },
  };
};

const verifyCompany = async (companyId: string) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company || company.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "Company not found");
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { isVerified: true, verifiedAt: new Date() },
  });

  return updated;
};

const setEmployerActive = async (userId: string, isActive: boolean) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.role !== "EMPLOYER") {
    throw new AppError(httpStatus.BAD_REQUEST, "User is not an employer");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  return updated;
};

const deleteEmployer = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.role !== "EMPLOYER") {
    throw new AppError(httpStatus.BAD_REQUEST, "User is not an employer");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false, deletedAt: new Date() },
  });

  return updated;
};

const adminService = {
  getEmployerStats,
  getEmployersList,
  verifyCompany,
  setEmployerActive,
  deleteEmployer,
};

export default adminService;
