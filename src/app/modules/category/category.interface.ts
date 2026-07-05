interface CategoryWithStats {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  description: string;
  icon: string;
  subcategories: string[];
  taxonomySkills?: { id: string; name: string; active: boolean }[];
  createdAt: Date;
  updatedAt: Date;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
}

interface Summary {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  averageApplicationsPerCategory: number;
}

interface CategoryStatisticsResponse {
  categories: CategoryWithStats[];
  summary: Summary;
}

interface QueryParams {
  search?: string;
  active?: "all" | "true" | "false";
  sortBy?: "name" | "totalJobs" | "totalApplications" | "createdAt";
  sortOrder?: "asc" | "desc";
}

type CategoryPayload = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  subcategories: string[];
  skills?: string[];
};

export type {
  CategoryPayload,
  CategoryStatisticsResponse,
  CategoryWithStats,
  QueryParams,
  Summary,
};
