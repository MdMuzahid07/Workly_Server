import bcrypt from "bcrypt";
import httpStatus from "http-status";
import config from "../../../config/index.js";
import {
  sendPasswordResetEmail,
  sendResendVerificationEmail,
  sendVerificationEmail,
} from "../../../utils/emailService.js";
import generateJsonWebToken from "../../../utils/generateJsonWebToken.js";
import generateVerificationToken from "../../../utils/generateVerificationToken.js";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const register = async (payload: any) => {
  const isExits = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (isExits) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User already exists with ${payload.email} this email`,
    );
  }

  const passwordHash = await bcrypt.hash(payload.password, Number(config.bcrypt_salt_rounds));

  const user = await prisma.user.create({
    data: {
      email: payload.email,
      passwordHash: passwordHash,
      fullName: payload.fullName,
      phone: payload.phone,
      role: payload.role,
      isActive: true,
      isVerified: false,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, "Failed to create user");
  }

  // Generate verification token
  const verificationToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  // Create verification token in database
  await prisma.verificationToken.create({
    data: {
      token: verificationToken,
      type: "EMAIL_VERIFICATION",
      userId: user.id,
      expiresAt: expiresAt,
    },
  });

  // Send verification email
  const verificationUrl = `${config.frontend_url}/verify-email?token=${verificationToken}`;

  try {
    await sendVerificationEmail(user.email, user.fullName, verificationUrl);
  } catch (error) {
    console.error("Failed to send verification email =>", error);
  }

  const jwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    isActive: user.isActive,
  };

  const accessToken = generateJsonWebToken(jwtPayload, "access");
  const refreshToken = generateJsonWebToken(jwtPayload, "refresh");

  const { passwordHash: _, ...safeUser } = user;

  return {
    safeUser,
    accessToken,
    refreshToken,
  };
};

const login = async (payload: any) => {
  const isExits = await prisma.user.findFirst({
    where: {
      email: payload.email,
    },
  });

  if (!isExits || !isExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found with ${payload.email} this email`);
  }

  const isPasswordMatch = await bcrypt.compare(payload.password, isExits.passwordHash);

  if (!isPasswordMatch) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid credentials");
  }

  if (!isExits.isVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Please verify your email address before logging in",
    );
  }

  const jwtPayload = {
    userId: isExits.id,
    email: isExits.email,
    role: isExits.role,
    isVerified: isExits.isVerified,
    isActive: isExits.isActive,
  };

  const accessToken = generateJsonWebToken(jwtPayload, "access");
  const refreshToken = generateJsonWebToken(jwtPayload, "refresh");
  const { passwordHash: _, ...safeUser } = isExits;

  return {
    accessToken,
    refreshToken,
    safeUser,
  };
};

// logout functionality added to the controller
const logout = async () => {};

const refresh = async () => {
  console.log("refresh");
};

const forgotPassword = async (payload: any) => {
  const email = payload.email;

  if (email) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is required");
  }

  const normalizedEmail = email.toLowerCase().trim();

  const isUserExists = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  const standardMessage =
    "If an account with that email exists, we've sent password reset instructions";

  if (!isUserExists || !isUserExists.isActive || !isUserExists.isVerified) {
    return {
      message: standardMessage,
      data: null,
    };
  }

  // =========== Rate limiting check ==========>
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentResetAttempts = await prisma.verificationToken.count({
    where: {
      userId: isUserExists.id,
      type: "PASSWORD_RESET",
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentResetAttempts >= 5) {
    console.log(`Rate limit exceeded for password reset`);

    return {
      message: standardMessage,
      data: null,
    };
  }

  await prisma.verificationToken.deleteMany({
    where: {
      userId: isUserExists.id,
      type: "PASSWORD_RESET",
      usedAt: null,
    },
  });

  const resetToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      token: resetToken,
      type: "PASSWORD_RESET",
      userId: isUserExists.id,
      expiresAt: expiresAt,
    },
  });

  const resetUrl = `${config.frontend_url}/reset-password?token=${resetToken}`;

  try {
    await sendPasswordResetEmail(isUserExists.email, isUserExists.fullName, resetUrl);
    console.log(`Password reset email sent successfully `);
  } catch (error) {
    console.error(`Password reset email send error => ${error}`);

    await prisma.verificationToken.deleteMany({
      where: {
        token: resetToken,
        userId: isUserExists.id,
        type: "PASSWORD_RESET",
        usedAt: null,
      },
    });

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to send password reset email. Please try again later.",
    );
  }

  return {
    message: standardMessage,
    data: {
      email: normalizedEmail,
    },
  };
};

const resetPassword = async (payload: any) => {
  const { token, newPassword, confirmPassword } = payload;

  if (!token) {
    throw new AppError(httpStatus.BAD_REQUEST, "Token is required");
  }

  if (!newPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "New password is required");
  }

  if (!confirmPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "Confirm password is required");
  }

  if (newPassword.length < 8) {
    throw new AppError(httpStatus.BAD_REQUEST, "Password must be at least 8 characters long");
  }

  // =========== Find and validate reset token ============>

  const resetTokenRecord = await prisma.verificationToken.findUnique({
    where: { token: token.trim() },
    include: { user: true },
  });

  if (!resetTokenRecord || resetTokenRecord.type !== "PASSWORD_RESET") {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid or expired password reset token");
  }

  // ======== Checking reset token expiry ========>
  if (resetTokenRecord.expiresAt < new Date()) {
    // ====== Cleaning up expired token =====>
    await prisma.verificationToken.delete({
      where: {
        id: resetTokenRecord.id,
      },
    });

    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Password reset token has expired, please request a new one",
    );
  }
};

const verifyEmail = async (payload: any) => {
  const { token } = payload;

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!verificationToken) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid verification token");
  }

  if (verificationToken.expiresAt < new Date()) {
    throw new AppError(httpStatus.BAD_REQUEST, "Verification token has expired");
  }

  if (verificationToken.usedAt) {
    throw new AppError(httpStatus.BAD_REQUEST, "Verification token has already been used");
  }

  if (verificationToken.user.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is already verified");
  }

  await prisma.user.update({
    where: { id: verificationToken.userId },
    data: { isVerified: true },
  });

  await prisma.verificationToken.update({
    where: { id: verificationToken.id },
    data: { usedAt: new Date() },
  });

  return {
    message: "Email verified successfully",
    user: {
      id: verificationToken.user.id,
      email: verificationToken.user.email,
      fullName: verificationToken.user.fullName,
      isVerified: true,
    },
  };
};

const resendVerificationEmail = async (payload: any) => {
  const { email } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found with this email");
  }

  if (user.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is already verified");
  }

  await prisma.verificationToken.deleteMany({
    where: {
      userId: user.id,
      type: "EMAIL_VERIFICATION",
      usedAt: null,
    },
  });

  const verificationToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  await prisma.verificationToken.create({
    data: {
      token: verificationToken,
      type: "EMAIL_VERIFICATION",
      userId: user.id,
      expiresAt: expiresAt,
    },
  });

  const verificationUrl = `${config.frontend_url}/verify-email?token=${verificationToken}`;

  try {
    await sendResendVerificationEmail(user.email, user.fullName, verificationUrl);
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to send verification email");
  }

  return {
    message: "Verification email sent successfully",
    email: user.email,
  };
};

const authService = {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
};
export default authService;
