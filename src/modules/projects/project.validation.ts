import { z } from "zod";

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(255, "Project name must not exceed 255 characters"),

  description: z.string().trim().optional(),

  clientId: z.string().trim().min(1, "Client ID is required"),

  memberIds: z
    .array(z.string().trim().min(1, "Member ID cannot be empty"))
    .optional()
    .default([]),
});

export const updateProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Project name cannot be empty")
      .max(255, "Project name must not exceed 255 characters")
      .optional(),

    description: z.string().trim().nullable().optional(),

    clientId: z.string().trim().min(1, "Client ID cannot be empty").optional(),

    memberIds: z
      .array(z.string().trim().min(1, "Member ID cannot be empty"))
      .optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.clientId !== undefined ||
      data.memberIds !== undefined,
    {
      message: "At least one field must be provided for update",
    },
  );

export function getProjectValidationError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request data";
}

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
