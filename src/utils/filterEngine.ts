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
