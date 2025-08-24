/* eslint-disable @typescript-eslint/no-explicit-any */
const register = async (payload: any) => {
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
