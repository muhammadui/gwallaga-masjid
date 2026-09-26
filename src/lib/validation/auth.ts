import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(8, "Password is at least 8 characters"),
});

export type SignInInput = z.infer<typeof signInSchema>;
