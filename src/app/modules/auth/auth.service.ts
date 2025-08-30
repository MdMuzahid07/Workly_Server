import bcrypt from "bcrypt";
import httpStatus from "http-status";
import config from "../../../config/index.js";
import { sendResendVerificationEmail, sendVerificationEmail } from "../../../utils/emailService.js";
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
  console.log(payload);
};

const resetPassword = async (payload: any) => {
  console.log(payload);
};

const verifyEmail = async (payload: any) => {
  const { token } = payload;

  // Find the verification token
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!verificationToken) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid verification token");
  }

  // Check if token is expired
  if (verificationToken.expiresAt < new Date()) {
    throw new AppError(httpStatus.BAD_REQUEST, "Verification token has expired");
  }

  // Check if token is already used
  if (verificationToken.usedAt) {
    throw new AppError(httpStatus.BAD_REQUEST, "Verification token has already been used");
  }

  // Check if user is already verified
  if (verificationToken.user.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is already verified");
  }

  // Update user as verified
  await prisma.user.update({
    where: { id: verificationToken.userId },
    data: { isVerified: true },
  });

  // Mark token as used
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

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found with this email");
  }

  // Check if user is already verified
  if (user.isVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, "Email is already verified");
  }

  // Delete any existing unused verification tokens for this user
  await prisma.verificationToken.deleteMany({
    where: {
      userId: user.id,
      type: "EMAIL_VERIFICATION",
      usedAt: null,
    },
  });

  // Generate new verification token
  const verificationToken = generateVerificationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  // Create new verification token
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
