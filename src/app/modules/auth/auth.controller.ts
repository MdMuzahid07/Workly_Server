import type { RequestHandler } from "express";
import httpStatus from "http-status";
import { env } from "../../../config/index.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import prisma from "../../../utils/prismaClient.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import AppError from "../../error/AppError.js";
import authService from "./auth.service.js";

const register: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  const refreshToken = result.refreshToken;
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User registered successfully. Please check your email to verify your account.",
    data: {
      fullName: result.safeUser.fullName,
      phone: result.safeUser.phone,
      email: result.safeUser.email,
      isVerified: result.safeUser.isVerified,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      safeUser: result.safeUser,
    },
  });
});

const login: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  const refreshToken = result.refreshToken;
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User logged in successfully",
    data: {
      fullName: result.safeUser.fullName,
      email: result.safeUser.email,
      phone: result.safeUser.phone,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      safeUser: result.safeUser,
    },
  });
});

//@ts-ignore
const logout: RequestHandler = asyncHandler(async (req, res) => {
  // await authService.logout();

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");

  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User registered successfully",
  });
});

const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const result = await authService.refresh(refreshToken);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Token refresh successfully",
    data: {
      accessToken: result.accessToken,
    },
  });
});

const forgotPassword: RequestHandler = asyncHandler(async (req, res) => {
  const payload = req.body;
  const result = await authService.forgotPassword(payload);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result.data || null,
  });
});

const resetPassword: RequestHandler = asyncHandler(async (req, res) => {
  const payload = req.body;
  await authService.resetPassword(payload);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset successfully",
  });
});

const verifyEmail: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body);

  if (result.refreshToken) {
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

const resendVerificationEmail: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.resendVerificationEmail(req.body);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: { email: result.email },
  });
});

const getCurrentUser: RequestHandler = asyncHandler(async (req, res) => {
  const tokenUser = req.user as any;

  if (!tokenUser?.userId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenUser.userId },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  let isPremium = user.isPremium;
  if (!isPremium && user.role === "EMPLOYER" && user.companyId) {
    const activeSub = await prisma.subscription.findUnique({
      where: { companyId: user.companyId },
    });
    if (activeSub && activeSub.status === "ACTIVE") {
      isPremium = true;
    }
  }

  const { passwordHash: _, ...rest } = user as any;

  const data = {
    ...rest,
    isPremium: env.NODE_ENV !== "production" ? true : isPremium,
  };

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User retrieved successfully",
    data,
  });
});

const googleOAuth = asyncHandler(async (req, res) => {
  const googleProfile = req.user as unknown as {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  };

  // Extract role from state parameter (passed through OAuth flow)
  let role: "EMPLOYER" | "JOB_SEEKER" = "JOB_SEEKER"; // Default role
  try {
    const stateParam = req.query.state as string | undefined;
    if (stateParam) {
      const state = JSON.parse(decodeURIComponent(stateParam));
      if (state.role && (state.role === "EMPLOYER" || state.role === "JOB_SEEKER")) {
        role = state.role;
      }
    }
  } catch (error) {
    console.warn("Failed to parse state parameter, using default role:", error);
  }

  const result = await authService.googleOAuth(googleProfile, role);

  // Set refresh token in httpOnly cookie (same pattern as login/register)
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Redirect back to frontend callback page with accessToken + user data
  const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/google/callback`);
  redirectUrl.searchParams.set("accessToken", result.accessToken);
  redirectUrl.searchParams.set("user", JSON.stringify(result.safeUser));

  return res.redirect(redirectUrl.toString());
});

const changePassword: RequestHandler = asyncHandler(async (req, res) => {
  //@ts-ignore
  const userId = req.user.userId;
  const payload = req.body;
  const result = await authService.changePassword(userId, payload);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
  });
});

const authController = {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
  getCurrentUser,
  googleOAuth,
  changePassword,
};

export default authController;
