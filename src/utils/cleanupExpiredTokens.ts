import prisma from './prismaClient.js';
import { logger } from './logger.js';

const cleanupExpiredTokens = async () => {
  try {
    const result = await prisma.verificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  } catch (error) {
    logger.error({ err: error }, 'Error cleaning up expired tokens');
    throw error;
  }
};

export default cleanupExpiredTokens;
