import { z } from "zod";

export const createTaskAttachmentSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1, "File name is required")
    .max(255, "File name must not exceed 255 characters"),

  fileUrl: z.string().trim().url("File URL must be a valid URL"),

  fileSize: z
    .number()
    .int("File size must be an integer")
    .positive("File size must be greater than 0")
    .optional(),

  mimeType: z
    .string()
    .trim()
    .min(1, "MIME type cannot be empty")
    .max(100, "MIME type must not exceed 100 characters")
    .optional(),
});
