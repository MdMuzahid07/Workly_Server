import type { RequestHandler } from "express";

const register: RequestHandler = async (req, res) => {
  console.log(req.body);
};

const login: RequestHandler = async (req, res) => {
  console.log(req.body);
};

const logout: RequestHandler = async (req, res) => {
  console.log("logout");
};

const refresh: RequestHandler = async (req, res) => {
  console.log("refresh");
};

const forgotPassword: RequestHandler = async (req, res) => {
  console.log(req.body);
};

const resetPassword: RequestHandler = async (req, res) => {
  console.log(req.body);
};

const verifyEmail: RequestHandler = async (req, res) => {
  console.log(req.body);
};

const resendVerificationEmail: RequestHandler = async (req, res) => {
  console.log(req.body);
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
