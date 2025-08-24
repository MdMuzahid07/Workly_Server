import httpStatus from "http-status";
import prisma from "../../../utils/prismaClient.js";
import AppError from "../../error/AppError.js";

const register = async (payload: any) => {
  const isExits = await prisma.user.find({
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

  console.log(payload);
};

const login = async (payload: any) => {
  console.log(payload);
};

const logout = async () => {
  console.log("logout");
};

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
