### Factory functions with filter engine

These helpers create `FilterEngine` instances configured for specific Prisma models.

Available factories:

- **createCompanyFilter(prisma)**: filters for `companies`
- **createJobFilter(prisma)**: filters for `jobs`
- **createUserFilter(prisma)**: filters for `users`

Usage:

```ts
import factory from "../src/utils/FactoryFunctionsWithFilterEngine.js";

const companyFilter = factory.createCompanyFilter(prisma);
const { where, orderBy, skip, take } = await companyFilter.filter({
  search: "acme",
  searchIn: ["name", "industry"],
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 10,
});

const companies = await prisma.company.findMany({ where, orderBy, skip, take });
```

Notes:

- Factories pass a controlled allow-list of fields to `FilterEngine` to keep queries safe.
- Extend or add a new factory by supplying the model and an allow-list of fields.
