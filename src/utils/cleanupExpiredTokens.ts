import prisma from "./prismaClient.js";

const cleanupExpiredTokens = async () => {
  try {
    const result = await prisma.verificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`Cleaned up ${result.count} expired verification tokens`);
    return result.count;
  } catch (error) {
    console.error("Error cleaning up expired tokens:", error);
    throw error;
  }
};

export default cleanupExpiredTokens;
