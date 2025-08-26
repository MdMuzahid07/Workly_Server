import bcrypt from "bcrypt";
import httpStatus from "http-status";
import config from "../../../config/index.js";
import generateJsonWebToken from "../../../utils/generateJsonWebToken.js";
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
      //! need to remove this two line before production
      isActive: true,
      isVerified: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.BAD_REQUEST, "Failed to create user");
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
  console.log(payload);
};

const resendVerificationEmail = async (payload: any) => {
  console.log(payload);
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
