import { z } from "zod";

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment content is required")
    .max(5000, "Comment content must not exceed 5000 characters"),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Comment content is required")
    .max(5000, "Comment content must not exceed 5000 characters"),
});

export function getCommentValidationError(
  error: z.ZodError,
): string {
  return error.issues[0]?.message ?? "Invalid request data";
}

export type CreateCommentInput = z.infer<
  typeof createCommentSchema
>;

export type UpdateCommentInput = z.infer<
  typeof updateCommentSchema
>;
