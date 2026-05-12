import bcrypt from "bcrypt";
import httpStatus from "http-status";
import jwt from "jsonwebtoken";
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
  // Normalize email (consistent with googleOAuth and forgotPassword)
  const normalizedEmail = (payload.email || "").toLowerCase().trim();

  if (!normalizedEmail) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is required");
  }

  const isExits = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (isExits) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User already exists with ${normalizedEmail} this email`,
    );
  }

  const passwordHash = await bcrypt.hash(payload.password, Number(config.bcrypt_salt_rounds));

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
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
  // Normalize email (consistent with register, googleOAuth, and forgotPassword)
  const normalizedEmail = (payload.email || "").toLowerCase().trim();

  if (!normalizedEmail) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is required");
  }

  const isExits = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (!isExits || !isExits?.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, `User not found with ${normalizedEmail} this email`);
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

  // Update lastLogin (consistent with googleOAuth)
  const user = await prisma.user.update({
    where: { id: isExits.id },
    data: { lastLogin: new Date() },
  });

  const jwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    companyId: user.companyId,
    isActive: user.isActive,
  };

  const accessToken = generateJsonWebToken(jwtPayload, "access");
  const refreshToken = generateJsonWebToken(jwtPayload, "refresh");
  const { passwordHash: _, ...safeUser } = user;

  return {
    accessToken,
    refreshToken,
    safeUser,
  };
};

// logout functionality added to the controller
const logout = async () => {};

const refresh = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token is required");
  }

  let decodedRefreshToken: any;
  try {
    decodedRefreshToken = jwt.verify(refreshToken, config.jwt_refresh_secret);
  } catch (error) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
  }

  const isUserExists = await prisma.user.findUnique({
    where: {
      id: decodedRefreshToken.userId,
    },
  });

  if (!isUserExists || !isUserExists.isActive) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not found");
  }

  if (!isUserExists.isVerified) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Please verify your email address before logging in",
    );
  }

  const jwtPayload = {
    userId: isUserExists.id,
    email: isUserExists.email,
    role: isUserExists.role,
    isVerified: isUserExists.isVerified,
    isActive: isUserExists.isActive,
  };

  const newAccessToken = generateJsonWebToken(jwtPayload, "access");
  return {
    accessToken: newAccessToken,
  };
};

const forgotPassword = async (payload: any) => {
  const email = payload.email;

  if (!email) {
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

  if (resetTokenRecord.usedAt) {
    throw new AppError(httpStatus.BAD_REQUEST, "Password reset token has already been used");
  }

  if (!resetTokenRecord.user || !resetTokenRecord.user.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, "User not found");
  }

  if (newPassword !== confirmPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "Passwords do not match");
  }

  const isSamePassword = await bcrypt.compare(newPassword, resetTokenRecord.user.passwordHash);
  if (isSamePassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "New password must be different from your old one");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));

  const result = await prisma.$transaction(async (transactor) => {
    await transactor.user.update({
      where: { id: resetTokenRecord.user.id },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    await transactor.verificationToken.update({
      where: { id: resetTokenRecord.id },
      data: {
        usedAt: new Date(),
      },
    });
  });

  return result;
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

const googleOAuth = async (
  googleProfile: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  },
  role: "EMPLOYER" | "JOB_SEEKER" = "JOB_SEEKER",
) => {
  const normalizedEmail = (googleProfile.email || "").toLowerCase().trim();

  if (!normalizedEmail) {
    throw new AppError(httpStatus.BAD_REQUEST, "Google account email is required");
  }

  // If the user already exists, mark verified (Google emails are verified) and update lastLogin.
  // If not, create a new local user with a random passwordHash (OAuth user doesn't use password).
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (user && !user.isActive) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User is inactive");
  }

  if (!user) {
    const randomPassword = generateVerificationToken();
    const passwordHash = await bcrypt.hash(randomPassword, Number(config.bcrypt_salt_rounds));

    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: googleProfile.name || normalizedEmail,
        role: role, // Use role from state parameter
        isActive: true,
        isVerified: true,
        lastLogin: new Date(),
      },
    });
  } else {
    // If user exists, update lastLogin but don't change their existing role
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        lastLogin: new Date(),
      },
    });
  }

  const jwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    companyId: user.companyId,
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

const changePassword = async (userId: string, payload: any) => {
  const { oldPassword, newPassword } = payload;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const isPasswordMatch = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!isPasswordMatch) {
    throw new AppError(httpStatus.BAD_REQUEST, "Incorrect old password");
  }

  const newPasswordHash = await bcrypt.hash(newPassword, Number(config.bcrypt_salt_rounds));

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
    },
  });

  return {
    message: "Password changed successfully",
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
  googleOAuth,
  changePassword,
};
export default authService;
