import z from "zod";

const register = z.object({
  email: z
    .string({ message: "Invalid email address" })
    .min(1, { message: "Email is required" })
    .max(250, { message: "Email is too long" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" })
    .max(32, { message: "Password can't be more than 32 characters long" }),
  phone: z
    .string()
    .min(10, { message: "Phone number must be at least 10 characters long" })
    .max(15, { message: "Phone number can't be more than 15 characters long" })
    .optional(),
});

const authValidation = {
  register,
};

export default authValidation;
