### Filter engine

A small utility to build Prisma-friendly filtering, sorting, and pagination in a consistent and safe way.

Key features:

- **Field validation**: prevents unsafe queries (only allowed fields can be used)
- **Search**: case-insensitive contains across multiple fields
- **Filters**: exact match, in-array, numeric range, and date range
- **Sorting**: validated field + asc/desc
- **Pagination**: page, limit, total, pages
- **Soft delete**: excludes `deletedAt` by default unless `includeSoftDeleted` is true

Usage example:

```ts
const engine = new FilterEngine(prisma.user, "users", [
  "fullName",
  "email",
  "role",
  "isVerified",
  "createdAt",
]);

const { where, orderBy, skip, take, pagination } = await engine.filter({
  search: "john",
  searchIn: ["fullName", "email"],
  where: { isVerified: true },
  whereIn: { role: ["ADMIN", "USER"] },
  range: { age: { min: 18, max: 60 } },
  dateRange: { createdAt: { start: new Date("2023-01-01"), end: new Date() } },
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 20,
});

const rows = await prisma.user.findMany({ where, orderBy, skip, take });
```

Quick search helper:

```ts
await engine.search("developer", ["title", "description"], { page: 2, limit: 10 });
```

Notes:

- Provide `allowedFields` to strictly control which fields are filterable/sortable.
- Invalid field names or bad ranges throw an `AppError` with proper status codes.
- `limit` is capped at 100 by default.
