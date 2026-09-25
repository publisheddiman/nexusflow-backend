import { z } from "zod";

export const departmentSchema = z.enum(["UI_UX", "FRONTEND", "BACKEND"]);

export const taskStatusSchema = z.enum([
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
]);

export const createTaskSchema = z.object({
  projectId: z.string().trim().min(1, "Project ID is required"),

  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(255, "Title must not exceed 255 characters"),

  description: z.string().trim().optional(),

  department: departmentSchema,

  assigneeId: z
    .string()
    .trim()
    .min(1, "Assignee ID cannot be empty")
    .optional(),

  isClientVisible: z.boolean().optional().default(false),
});

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title cannot be empty")
      .max(255, "Title must not exceed 255 characters")
      .optional(),

    description: z.string().trim().optional(),

    department: departmentSchema.optional(),

    assigneeId: z
      .string()
      .trim()
      .min(1, "Assignee ID cannot be empty")
      .nullable()
      .optional(),

    isClientVisible: z.boolean().optional(),

    version: z
      .number()
      .int("Version must be an integer")
      .positive("Version must be greater than 0"),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.department !== undefined ||
      data.assigneeId !== undefined ||
      data.isClientVisible !== undefined,
    {
      message: "At least one field must be provided for update",
    },
  );

export const changeTaskStatusSchema = z.object({
  status: taskStatusSchema,

  version: z
    .number()
    .int("Version must be an integer")
    .positive("Version must be greater than 0"),
});

export const deleteTaskSchema = z.object({
  version: z
    .number()
    .int("Version must be an integer")
    .positive("Version must be greater than 0"),
});

export function getValidationError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request data";
}
