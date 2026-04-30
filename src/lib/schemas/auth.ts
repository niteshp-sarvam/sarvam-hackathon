import { z } from "zod";
import { boundedString, emailSchema } from "./common";

const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(128, "Password must be at most 128 characters");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: boundedString(80).optional(),
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
