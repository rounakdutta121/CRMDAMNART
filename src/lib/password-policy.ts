import { z } from "zod";

const UPPERCASE = /[A-Z]/;
const LOWERCASE = /[a-z]/;
const NUMBER = /[0-9]/;
const SPECIAL = /[^A-Za-z0-9]/;

export const strongPasswordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128)
  .refine((value) => UPPERCASE.test(value), {
    message: "Password must include at least one uppercase letter.",
  })
  .refine((value) => LOWERCASE.test(value), {
    message: "Password must include at least one lowercase letter.",
  })
  .refine((value) => NUMBER.test(value), {
    message: "Password must include at least one number.",
  })
  .refine((value) => SPECIAL.test(value), {
    message: "Password must include at least one special character.",
  });

export function validateStrongPassword(password: string): string | null {
  const result = strongPasswordSchema.safeParse(password);
  return result.success ? null : result.error.issues[0]?.message ?? "Invalid password.";
}
