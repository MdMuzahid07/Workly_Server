import type { RequestHandler } from "express";
import authService from "./auth.service.js";

const register: RequestHandler = async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json(result);
};

const login: RequestHandler = async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json(result);
};

const logout: RequestHandler = async (req, res) => {
  const result = await authService.logout();
  res.status(200).json(result);
};

const refresh: RequestHandler = async (req, res) => {
  const result = await authService.refresh();
  res.status(200).json(result);
};

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
