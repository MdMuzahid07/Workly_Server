import prisma from "../../../utils/prismaClient.js";

const getLegalDocumentBySlug = async (slug: string) => {
  const result = await prisma.legalDocument.findUnique({
    where: {
      slug,
    },
  });
  return result;
};

const upsertLegalDocument = async (slug: string, payload: any) => {
  const result = await prisma.legalDocument.upsert({
    where: {
      slug,
    },
    update: payload,
    create: {
      slug,
      ...payload,
    },
  });
  return result;
};

const legalService = {
  getLegalDocumentBySlug,
  upsertLegalDocument,
};

export default legalService;
