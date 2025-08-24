import z from "zod";

const register = z.object({
  fullName: z.string().min(1, { message: "Full name is required" }),
  email: z.string({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" })
    .max(32, { message: "Password can't be more than 32 characters long" }),
});

const authValidation = {
  register,
};

export default authValidation;
