import z from "zod";

// P2: bcrypt silently truncates passwords longer than 72 bytes, making the
// extra characters invisible to the hash. Enforcing the limit here:
//   1. Makes the truncation explicit and user-visible (validation error)
//   2. Closes a historical DoS vector (unbounded input into bcrypt)
// Applied consistently across register, resetPassword, and changePassword.
const MAX_PASSWORD_BYTES = 72;

const register = z.object({
  fullName: z
    .string({ message: "Full name must be a string" })
    .min(1, { message: "Full name is required" })
    .max(250, { message: "Full name is too long" }),
  // B1 fix: restrict self-registration to JOB_SEEKER and EMPLOYER only.
  // ADMIN and SUPER_ADMIN must be assigned by an existing SUPER_ADMIN via
  // the admin panel — never accepted from a public registration request.
  role: z
    .enum(["JOB_SEEKER", "EMPLOYER"], { message: "Role must be JOB_SEEKER or EMPLOYER" })
    .default("JOB_SEEKER"),
  email: z
    .string({ message: "Invalid email address" })
    .min(1, { message: "Email is required" })
    .max(250, { message: "Email is too long" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" })
    .max(MAX_PASSWORD_BYTES, {
      message: `Password cannot exceed ${MAX_PASSWORD_BYTES} characters (bcrypt limit)`,
    }),
  phone: z
    .string()
    .min(10, { message: "Phone number must be at least 10 characters long" })
    .max(15, { message: "Phone number can't be more than 15 characters long" })
    .optional(),
});

const verifyEmail = z.object({
  token: z.string().min(1, { message: "Verification token is required" }),
});

const resendVerificationEmail = z.object({
  email: z
    .string({ message: "Invalid email address" })
    .min(1, { message: "Email is required" })
    .max(250, { message: "Email is too long" }),
});

// P2: same 72-byte limit applied to password-change flows
const changePassword = z.object({
  oldPassword: z.string().min(1, { message: "Old password is required" }),
  newPassword: z
    .string()
    .min(6, { message: "New password must be at least 6 characters" })
    .max(MAX_PASSWORD_BYTES, {
      message: `Password cannot exceed ${MAX_PASSWORD_BYTES} characters (bcrypt limit)`,
    }),
});

// P2: same 72-byte limit on reset flow
const resetPassword = z.object({
  token: z.string().min(1, { message: "Reset token is required" }),
  newPassword: z
    .string()
    .min(8, { message: "Password must be at least 8 characters long" })
    .max(MAX_PASSWORD_BYTES, {
      message: `Password cannot exceed ${MAX_PASSWORD_BYTES} characters (bcrypt limit)`,
    }),
  confirmPassword: z.string().min(1, { message: "Confirm password is required" }),
});

const authValidation = {
  register,
  verifyEmail,
  resendVerificationEmail,
  changePassword,
  resetPassword,
};

export default authValidation;
