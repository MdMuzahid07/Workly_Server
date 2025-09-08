import httpStatus from "http-status";
import AppError from "../app/error/AppError.js";

// Filter types
type FilterValue = string | number | boolean | Date | null | undefined;
type FilterArray = FilterValue[];
type RangeFilter = { min?: FilterValue; max?: FilterValue };
type DateRangeFilter = { start?: Date; end?: Date };

//*  ===== filter option type ============>
export interface FilterOptions {
  //* =================== For searching ===================>
  search?: string;
  // ============== Fields to search in ===========>
  searchIn: string[];

  //* ======= Filters =======>
  where?: Record<string, FilterValue>; // ========== Exact match =========>
  whereIn?: Record<string, FilterArray>; // =============== In array===============>
  range?: Record<string, RangeFilter>; // =============== Range===============>
  dateRange?: Record<string, DateRangeFilter>; // =============== Date range===============>

  //* =========== For sorting and pagination ===============>

  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;

  //* =========== Options ===============>
  includeSoftDeleted?: boolean;
}

export interface FilterResult {
  where: any; //* Prisma where clause ==========>
  orderBy: any; //* Prisma orderBy clause =============>
  skip: number;
  take: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class FilterEngine {
  private allowedFields: Set<string>;
  //@ts-ignore

  private model: any;
  //@ts-ignore

  private tableName: string;

  constructor(model: any, tableName: string, allowedFields: string[] = []) {
    this.allowedFields = new Set(allowedFields);
    this.tableName = tableName;
    this.model = model;
  }

  //! ============ VALIDATE FIELD NAME TO PREVENT SQL INJECTION ==========>

  //@ts-ignore
  private validateField(field: string): void {
    if (this.allowedFields.size > 0 && !this.allowedFields.has(field)) {
      throw new AppError(httpStatus.BAD_REQUEST, `${field} is not allowed`);
    }

    // Only alphanumerics and underscores are allowed
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) {
      throw new Error(`Invalid field name: ${field}`);
    }
  }
}
