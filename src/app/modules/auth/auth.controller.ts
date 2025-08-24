import type { RequestHandler } from "express";
import httpStatus from "http-status";
import config from "../../../config/index.js";
import sendApiResponse from "../../../utils/sendApiResponse.js";
import authService from "./auth.service.js";

const register: RequestHandler = async (req, res) => {
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
    message: "User registered successfully",
    data: {
      fullName: result.safeUser.fullName,
      email: result.safeUser.email,
      role: result.safeUser.role,
      isVerified: result.safeUser.isVerified,
      accessToken: result.accessToken,
    },
  });
};

const login: RequestHandler = async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json(result);
};

//@ts-ignore
const logout: RequestHandler = async (req, res) => {
  const result = await authService.logout();
  res.status(200).json(result);
};

//@ts-ignore
const refresh: RequestHandler = async (req, res) => {
  const result = await authService.refresh();
  res.status(200).json(result);
};
//@ts-ignore

const forgotPassword: RequestHandler = async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  res.status(200).json(result);
};

const resetPassword: RequestHandler = async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.status(200).json(result);
};

const verifyEmail: RequestHandler = async (req, res) => {
  const result = await authService.verifyEmail(req.body);
  res.status(200).json(result);
};

const resendVerificationEmail: RequestHandler = async (req, res) => {
  const result = await authService.resendVerificationEmail(req.body);
  res.status(200).json(result);
};

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
