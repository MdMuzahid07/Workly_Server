// import httpStatus from "http-status";
// import AppError from "../app/error/AppError.js";

// //* ========== Types and interfaces ===========>
// type FilterValue = string | number | boolean | Date | null | undefined;
// type FilterArray = FilterValue[];
// type RangeFilter = { min?: FilterValue; max?: FilterValue };
// type DateRangeFilter = { start?: Date; end?: Date };

// export interface FilterOptions {
//   // ========== For searching ==========>
//   search?: string;
//   searchIn?: string[]; // ============== Fields to search in =========>

//   // ============== Filters ===========>
//   where?: Record<string, FilterValue>; // ============= Exact match ===========>
//   whereIn?: Record<string, FilterArray>; // ============= In array ===========>
//   range?: Record<string, RangeFilter>; // =============== Range ===========>
//   dateRange?: Record<string, DateRangeFilter>; // ============== Date range ========>

//   // ============ For sorting and pagination ===========>
//   sortBy?: string;
//   sortOrder?: "asc" | "desc";
//   page?: number;
//   limit?: number;

//   // =========== Options ===========>
//   includeSoftDeleted?: boolean;
// }

// export interface FilterResult {
//   where: any; //* ========== PRISMA WHERE CLAUSE =========>
//   orderBy: any; //* ========== PRISMA ORDERBY CLAUSE =========>
//   skip: number;
//   take: number;
//   pagination: {
//     page: number;
//     limit: number;
//     total: number;
//     pages: number;
//   };
// }

// //* ========== Types and interfaces </===========

// //* ========== FilterEngine class ===========>
// export class FilterEngine {
//   private allowedFields: Set<string>;
//   private model: any;
//   private tableName: string;
//   private readonly MAX_LIMIT = 100;

//   constructor(model: any, tableName: string, allowedFields: string[] = []) {
//     if (!model) {
//       throw new AppError(httpStatus.BAD_REQUEST, "Model is required");
//     }
//     if (!tableName) {
//       throw new AppError(httpStatus.BAD_REQUEST, "Table name is required");
//     }

//     this.allowedFields = new Set(allowedFields);
//     this.tableName = tableName;
//     this.model = model;
//   }

//   // ============= Validate field name to prevent SQL injection =======>
//   private validateField(field: string): void {
//     if (!field || typeof field !== "string") {
//       throw new AppError(httpStatus.BAD_REQUEST, "Field name must be a string");
//     }

//     if (this.allowedFields.size > 0 && !this.allowedFields.has(field)) {
//       throw new AppError(
//         httpStatus.BAD_REQUEST,
//         `Field '${field}' is not allowed for filtering on '${this.tableName}'.`,
//       );
//     }

//     // =========  Only alphanumerics and underscores are allowed =======>
//     if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
//       throw new AppError(
//         httpStatus.BAD_REQUEST,
//         `Invalid field name '${field}' for '${this.tableName}'.`,
//       );
//     }
//   }

//   // ============ Check if value is valid (0 and false are valid) =========>
//   private isValidValue(value: any): boolean {
//     // ============ Treat 0 and false as valid values =========>
//     return value !== undefined && value !== null && value !== "";
//   }

//   // ============ Validate date =========>
//   private isValidDate(date: any): date is Date {
//     return date instanceof Date && !isNaN(date.getTime());
//   }

//   // ============ Sanitize search term =========>
//   private sanitizeSearchTerm(search: string): string {
//     // ============ Remove potentially harmful characters =========>
//     return search.replace(/[%_\\]/g, "\\$&").trim();
//   }

//   // ============ Build where clause =========>
//   private buildWhereClause(filters: FilterOptions): any {
//     const where: any = {};

//     // ============ Soft delete handling =========>
//     if (!filters.includeSoftDeleted) {
//       where.deletedAt = null;
//     }

//     // ============ Search across multiple fields =========>
//     if (filters.search && Array.isArray(filters.searchIn) && filters.searchIn.length > 0) {
//       // ============ Validate search term length =========>
//       if (filters.search.length > 255) {
//         throw new AppError(httpStatus.BAD_REQUEST, "Search term too long");
//       }

//       filters.searchIn.forEach((field) => this.validateField(field));
//       const sanitizedSearch = this.sanitizeSearchTerm(filters.search);

//       where.OR = filters.searchIn.map((field) => ({
//         [field]: {
//           contains: sanitizedSearch,
//           mode: "insensitive" as const,
//         },
//       }));
//     }

//     // ============ Exact match =========>
//     if (filters.where) {
//       Object.entries(filters.where).forEach(([field, value]) => {
//         if (this.isValidValue(value)) {
//           this.validateField(field);
//           where[field] = value;
//         }
//       });
//     }

//     // =========== Array filters (in queries) ========>
//     if (filters.whereIn) {
//       Object.entries(filters.whereIn).forEach(([field, values]) => {
//         // ============ Proper array validation =========>
//         if (Array.isArray(values) && values.length > 0) {
//           this.validateField(field);

//           // ============ Limit array size to prevent performance issues =========>
//           if (values.length > 1000) {
//             throw new AppError(
//               httpStatus.BAD_REQUEST,
//               `Too many values for field '${field}' (max: 1000)`,
//             );
//           }

//           const validValues = values.filter((value) => this.isValidValue(value));
//           if (validValues.length > 0) {
//             where[field] = { in: validValues };
//           }
//         }
//       });
//     }

//     // =========== Range filters =========>
//     if (filters.range) {
//       Object.entries(filters.range).forEach(([field, range]) => {
//         this.validateField(field);
//         const rangeFilter: any = {};

//         if (this.isValidValue(range.min)) {
//           rangeFilter.gte = range.min;
//         }
//         if (this.isValidValue(range.max)) {
//           rangeFilter.lte = range.max;
//         }

//         // =========== Validate min <= max =========>
//         if (rangeFilter.gte !== undefined && rangeFilter.lte !== undefined) {
//           if (rangeFilter.gte > rangeFilter.lte) {
//             throw new AppError(
//               httpStatus.BAD_REQUEST,
//               `Invalid range for '${field}': min cannot be greater than max`,
//             );
//           }
//         }

//         if (Object.keys(rangeFilter).length > 0) {
//           where[field] = rangeFilter;
//         }
//       });
//     }

//     // ============ Date range filters =========>
//     if (filters.dateRange) {
//       Object.entries(filters.dateRange).forEach(([field, range]) => {
//         this.validateField(field);
//         const dateFilter: any = {};

//         // =========== Proper date validation =========>
//         if (range.start) {
//           if (!this.isValidDate(range.start)) {
//             throw new AppError(httpStatus.BAD_REQUEST, `Invalid start date for field '${field}'`);
//           }
//           dateFilter.gte = range.start;
//         }

//         if (range.end) {
//           if (!this.isValidDate(range.end)) {
//             throw new AppError(httpStatus.BAD_REQUEST, `Invalid end date for field '${field}'`);
//           }
//           dateFilter.lte = range.end;
//         }

//         // =========== Validate start <= end ========>
//         if (dateFilter.gte && dateFilter.lte && dateFilter.gte > dateFilter.lte) {
//           throw new AppError(
//             httpStatus.BAD_REQUEST,
//             `Invalid date range for '${field}': start date cannot be after end date`,
//           );
//         }

//         if (Object.keys(dateFilter).length > 0) {
//           where[field] = dateFilter;
//         }
//       });
//     }

//     return where;
//   }

//   // ============ Build orderBy clause ========>
//   private buildOrderByClause(sortBy?: string, sortOrder: "asc" | "desc" = "desc"): any {
//     if (!sortBy) return { createdAt: "desc" };

//     this.validateField(sortBy);

//     // =========== Validate sort order =========>
//     if (!["asc", "desc"].includes(sortOrder)) {
//       throw new AppError(httpStatus.BAD_REQUEST, "Sort order must be 'asc' or 'desc'");
//     }

//     return { [sortBy]: sortOrder };
//   }

//   // ============ Main filter method =========>
//   async filter(filters: FilterOptions = {}): Promise<FilterResult> {
//     try {
//       // =========== Validate pagination parameters =========>
//       const page = Math.max(1, filters.page || 1);
//       const limit = Math.min(Math.max(1, filters.limit || 10), this.MAX_LIMIT);
//       const skip = (page - 1) * limit;

//       const where = this.buildWhereClause(filters);
//       const orderBy = this.buildOrderByClause(filters.sortBy, filters.sortOrder);

//       // ============ Get total count =========>
//       const total = await this.model.count({ where });

//       return {
//         where,
//         orderBy,
//         skip,
//         take: limit,
//         pagination: {
//           page,
//           limit,
//           total,
//           pages: Math.ceil(total / limit),
//         },
//       };
//     } catch (error) {
//       // =========== Re-throw AppError, wrap other errors =========>
//       if (error instanceof AppError) {
//         throw error;
//       }

//       console.error("FilterEngine error:", error);
//       throw new AppError(
//         httpStatus.INTERNAL_SERVER_ERROR,
//         "An error occurred while processing filters",
//       );
//     }
//   }

//   // =========== Helper for quick searches ========>
//   async search(
//     searchTerm: string,
//     searchFields: string[],
//     additionalFilters: Omit<FilterOptions, "search" | "searchIn"> = {},
//   ): Promise<FilterResult> {
//     // =========== Validate inputs =========>
//     if (!searchTerm || typeof searchTerm !== "string") {
//       throw new AppError(httpStatus.BAD_REQUEST, "Search term is required and must be a string");
//     }

//     if (!Array.isArray(searchFields) || searchFields.length === 0) {
//       throw new AppError(httpStatus.BAD_REQUEST, "Search fields must be a non-empty array");
//     }

//     return this.filter({
//       search: searchTerm.trim(),
//       searchIn: searchFields,
//       ...additionalFilters,
//     });
//   }

//   // ========= Get allowed fields (for debugging) ========>
//   getAllowedFields(): string[] {
//     return Array.from(this.allowedFields);
//   }
// }

import httpStatus from "http-status";
import AppError from "../app/error/AppError.js";

//* ========== Types and interfaces ===========>
type FilterValue = string | number | boolean | Date | null | undefined;
type FilterArray = FilterValue[];
type RangeFilter = { min?: FilterValue; max?: FilterValue };
type DateRangeFilter = { start?: Date; end?: Date };

export interface FilterOptions {
  // ========== For searching ==========>
  search?: string;
  searchIn?: string[]; // ============== Fields to search in =========>

  // ============== Filters ===========>
  where?: Record<string, FilterValue>; // ============= Exact match ===========>
  whereIn?: Record<string, FilterArray>; // ============= In array ===========>
  range?: Record<string, RangeFilter>; // =============== Range ===========>
  dateRange?: Record<string, DateRangeFilter>; // ============== Date range ========>

  // ============ For sorting and pagination ===========>
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;

  // =========== Options ===========>
  includeSoftDeleted?: boolean;

  // =========== Custom where clause for complex queries ===========>
  customWhere?: any; // For relation filters, OR conditions, etc.
}

export interface FilterResult {
  where: any; //* ========== PRISMA WHERE CLAUSE =========>
  orderBy: any; //* ========== PRISMA ORDERBY CLAUSE =========>
  skip: number;
  take: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

//* ========== Types and interfaces </===========

//* ========== FilterEngine class ===========>
export class FilterEngine {
  private allowedFields: Set<string>;
  private model: any;
  private tableName: string;
  private readonly MAX_LIMIT = 100;
  private readonly MAX_SEARCH_LENGTH = 255;
  private readonly MAX_ARRAY_SIZE = 1000;

  constructor(model: any, tableName: string, allowedFields: string[] = []) {
    if (!model) {
      throw new AppError(httpStatus.BAD_REQUEST, "Model is required");
    }
    if (!tableName) {
      throw new AppError(httpStatus.BAD_REQUEST, "Table name is required");
    }

    this.allowedFields = new Set(allowedFields);
    this.tableName = tableName;
    this.model = model;
  }

  // ============= Validate field name to prevent SQL injection =======>
  private validateField(field: string): void {
    if (!field || typeof field !== "string") {
      throw new AppError(httpStatus.BAD_REQUEST, "Field name must be a string");
    }

    if (this.allowedFields.size > 0 && !this.allowedFields.has(field)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Field '${field}' is not allowed for filtering on '${this.tableName}'.`,
      );
    }

    // =========  Only alphanumerics and underscores are allowed =======>
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Invalid field name '${field}' for '${this.tableName}'.`,
      );
    }
  }

  // ============ Check if value is valid (0 and false are valid) =========>
  private isValidValue(value: any): boolean {
    // ============ Treat 0 and false as valid values =========>
    return value !== undefined && value !== null && value !== "";
  }

  // ============ Validate date =========>
  private isValidDate(date: any): date is Date {
    return date instanceof Date && !isNaN(date.getTime());
  }

  // ============ Sanitize search term =========>
  private sanitizeSearchTerm(search: string): string {
    // ============ Remove potentially harmful characters =========>
    return search.replace(/[%_\\]/g, "\\$&").trim();
  }

  // ============ Build where clause =========>
  private buildWhereClause(filters: FilterOptions): any {
    const where: any = {};

    // ============ Soft delete handling =========>
    if (!filters.includeSoftDeleted) {
      where.deletedAt = null;
    }

    // ============ Search across multiple fields =========>
    if (filters.search && Array.isArray(filters.searchIn) && filters.searchIn.length > 0) {
      // ============ Validate search term length =========>
      if (filters.search.length > this.MAX_SEARCH_LENGTH) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Search term too long (max: ${this.MAX_SEARCH_LENGTH} characters)`,
        );
      }

      filters.searchIn.forEach((field) => this.validateField(field));
      const sanitizedSearch = this.sanitizeSearchTerm(filters.search);

      where.OR = filters.searchIn.map((field) => ({
        [field]: {
          contains: sanitizedSearch,
          mode: "insensitive" as const,
        },
      }));
    }

    // ============ Exact match =========>
    if (filters.where) {
      Object.entries(filters.where).forEach(([field, value]) => {
        if (this.isValidValue(value)) {
          this.validateField(field);
          where[field] = value;
        }
      });
    }

    // =========== Array filters (in queries) ========>
    if (filters.whereIn) {
      Object.entries(filters.whereIn).forEach(([field, values]) => {
        // ============ Proper array validation =========>
        if (Array.isArray(values) && values.length > 0) {
          this.validateField(field);

          // ============ Limit array size to prevent performance issues =========>
          if (values.length > this.MAX_ARRAY_SIZE) {
            throw new AppError(
              httpStatus.BAD_REQUEST,
              `Too many values for field '${field}' (max: ${this.MAX_ARRAY_SIZE})`,
            );
          }

          const validValues = values.filter((value) => this.isValidValue(value));
          if (validValues.length > 0) {
            where[field] = { in: validValues };
          }
        }
      });
    }

    // =========== Range filters =========>
    if (filters.range) {
      Object.entries(filters.range).forEach(([field, range]) => {
        this.validateField(field);
        const rangeFilter: any = {};

        if (this.isValidValue(range.min)) {
          rangeFilter.gte = range.min;
        }
        if (this.isValidValue(range.max)) {
          rangeFilter.lte = range.max;
        }

        // =========== Validate min <= max =========>
        if (rangeFilter.gte !== undefined && rangeFilter.lte !== undefined) {
          if (rangeFilter.gte > rangeFilter.lte) {
            throw new AppError(
              httpStatus.BAD_REQUEST,
              `Invalid range for '${field}': min cannot be greater than max`,
            );
          }
        }

        if (Object.keys(rangeFilter).length > 0) {
          where[field] = rangeFilter;
        }
      });
    }

    // ============ Date range filters =========>
    if (filters.dateRange) {
      Object.entries(filters.dateRange).forEach(([field, range]) => {
        this.validateField(field);
        const dateFilter: any = {};

        // =========== Proper date validation =========>
        if (range.start) {
          if (!this.isValidDate(range.start)) {
            throw new AppError(httpStatus.BAD_REQUEST, `Invalid start date for field '${field}'`);
          }
          dateFilter.gte = range.start;
        }

        if (range.end) {
          if (!this.isValidDate(range.end)) {
            throw new AppError(httpStatus.BAD_REQUEST, `Invalid end date for field '${field}'`);
          }
          dateFilter.lte = range.end;
        }

        // =========== Validate start <= end ========>
        if (dateFilter.gte && dateFilter.lte && dateFilter.gte > dateFilter.lte) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Invalid date range for '${field}': start date cannot be after end date`,
          );
        }

        if (Object.keys(dateFilter).length > 0) {
          where[field] = dateFilter;
        }
      });
    }

    // =========== Custom where clause (for relations, complex queries) =========>
    if (filters.customWhere) {
      Object.assign(where, filters.customWhere);
    }

    return where;
  }

  // ============ Build orderBy clause ========>
  private buildOrderByClause(sortBy?: string, sortOrder: "asc" | "desc" = "desc"): any {
    if (!sortBy) return { createdAt: "desc" };

    this.validateField(sortBy);

    // =========== Validate sort order =========>
    if (!["asc", "desc"].includes(sortOrder)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Sort order must be 'asc' or 'desc'");
    }

    return { [sortBy]: sortOrder };
  }

  // ============ Main filter method =========>
  async filter(filters: FilterOptions = {}): Promise<FilterResult> {
    try {
      // =========== Validate pagination parameters =========>
      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(Math.max(1, filters.limit || 10), this.MAX_LIMIT);
      const skip = (page - 1) * limit;

      const where = this.buildWhereClause(filters);
      const orderBy = this.buildOrderByClause(filters.sortBy, filters.sortOrder);

      // ============ Get total count =========>
      const total = await this.model.count({ where });

      return {
        where,
        orderBy,
        skip,
        take: limit,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 0,
        },
      };
    } catch (error) {
      // =========== Re-throw AppError, wrap other errors =========>
      if (error instanceof AppError) {
        throw error;
      }

      console.error("FilterEngine error:", error);
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "An error occurred while processing filters",
      );
    }
  }

  // =========== Helper for quick searches ========>
  async search(
    searchTerm: string,
    searchFields: string[],
    additionalFilters: Omit<FilterOptions, "search" | "searchIn"> = {},
  ): Promise<FilterResult> {
    // =========== Validate inputs =========>
    if (!searchTerm || typeof searchTerm !== "string") {
      throw new AppError(httpStatus.BAD_REQUEST, "Search term is required and must be a string");
    }

    if (!Array.isArray(searchFields) || searchFields.length === 0) {
      throw new AppError(httpStatus.BAD_REQUEST, "Search fields must be a non-empty array");
    }

    return this.filter({
      search: searchTerm.trim(),
      searchIn: searchFields,
      ...additionalFilters,
    });
  }

  // ========= Get allowed fields (for debugging) ========>
  getAllowedFields(): string[] {
    return Array.from(this.allowedFields);
  }

  // ========= Get configuration ========>
  getConfig(): {
    tableName: string;
    maxLimit: number;
    maxSearchLength: number;
    maxArraySize: number;
  } {
    return {
      tableName: this.tableName,
      maxLimit: this.MAX_LIMIT,
      maxSearchLength: this.MAX_SEARCH_LENGTH,
      maxArraySize: this.MAX_ARRAY_SIZE,
    };
  }
}
