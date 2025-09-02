import type { RequestHandler } from "express";
import httpStatus from "http-status";
import config from "../../../config/index.js";
import asyncHandler from "../../../utils/asyncHandler.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import authService from "./auth.service.js";

const register: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  const refreshToken = result.refreshToken;
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: config.environment === "production" ? true : false,
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
    },
  });
});

const login: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  const refreshToken = result.refreshToken;
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: config.environment === "production" ? true : false,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  sendApiResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "User registered successfully",
    data: {
      fullName: result.safeUser.fullName,
      email: result.safeUser.email,
      phone: result.safeUser.phone,
      accessToken: result.accessToken,
    },
  });
});
//@ts-ignore
const logout: RequestHandler = asyncHandler(async (req, res) => {
  // await authService.logout();

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: config.environment === "production" ? true : false,
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

//@ts-ignore
const refresh: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.refresh();
  res.status(200).json(result);
});
//@ts-ignore

const forgotPassword: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result.data || null,
  });
});

const resetPassword: RequestHandler = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset successfully",
  });
});

const verifyEmail: RequestHandler = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body);

  sendApiResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result.user,
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

const authController = {
  register,
  login,
  logout,
  refresh,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
};

export default authController;
