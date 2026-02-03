import prisma from "./prismaClient.js";

/**
 * Base slugify function
 * @param text The text to slugify
 * @returns The slugified text
 *
 * This function takes a string and returns a slugified version of it.
 * The slugification process works as follows:
 * 1. Convert to lower case
 * 2. Normalize to NFKD
 * 3. Remove diacritics
 * 4. Replace any non-alphanumeric characters with a hyphen
 * 5. Remove leading and trailing hyphens
 * 6. Replace any double hyphens with a single hyphen
 */
function baseSlugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

/**
 * Generates a unique slug based on a given text and a model.
 * The generated slug will be suffixed with a number if the generated slug already exists.
 * @param text The text to generate a slug from
 * @param model The model to check for existing slugs
 * @param field The field on the model to check for existing slugs. Defaults to "slug"
 * @returns The generated slug
 */
type SlugModel = "company" | "job" | "industry";

async function generateUniqueSlug(
  text: string,
  model: SlugModel,
  field: string = "slug",
): Promise<string> {
  const baseSlug = baseSlugify(text);

  const existing = await (prisma as any)[model].findMany({
    where: { [field]: { startsWith: baseSlug } },
    select: { [field]: true },
  });

  const existingSlugs = new Set<string>(existing.map((e: Record<string, string>) => e[field]));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let maxSuffix = 0;
  const pattern = new RegExp(`^${baseSlug}(?:-(\\d+))?$`);
  for (const value of existingSlugs) {
    const match = value.match(pattern);
    if (match) {
      const num = match[1] ? parseInt(match[1], 10) : 0;
      if (!Number.isNaN(num) && num > maxSuffix) {
        maxSuffix = num;
      }
    }
  }

  return `${baseSlug}-${maxSuffix + 1}`;
}

export default generateUniqueSlug;
